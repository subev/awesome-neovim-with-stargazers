import PQueue from "p-queue";
import got from "got";
import { promises as fs } from "fs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("❌ Missing GITHUB_TOKEN in .env file");
  process.exit(1);
}

type BasicRepoInfo = {
  owner: string;
  repo: string;
};

type RepoDetailsGithub = {
  stargazers_count: number;
  description: string | null;
  html_url: string;
  name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
};

const queue = new PQueue({ concurrency: 10 });
const reposCache = new Map<string, RepoDetailsGithub>();

export const getRepoNames = (markdown: string) => {
  const repoNames: BasicRepoInfo[] = [];
  const repoRegex = /https:\/\/github\.com\/([\w-.]+)\/([\w-.]+)/g;
  let match: RegExpExecArray | null;
  while ((match = repoRegex.exec(markdown)) !== null) {
    repoNames.push({ owner: match[1], repo: match[2] });
  }
  return repoNames;
};

const githubFetch = async <T>(url: string): Promise<T> => {
  const response = got(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
  });

  return response.json();
};

export const fetchRepoDetails = async ({ owner, repo }: BasicRepoInfo) => {
  console.log(`Fetching details for ${owner}/${repo}`);
  const repoDetails = await githubFetch<RepoDetailsGithub>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  return repoDetails;
};

export const fetchAndCacheRepoDetails = async ({
  owner,
  repo,
}: BasicRepoInfo) => {
  const cacheKey = `${owner}/${repo}`;
  if (reposCache.has(cacheKey)) {
    return reposCache.get(cacheKey)!;
  }
  const repoDetails = await fetchRepoDetails({ owner, repo });
  reposCache.set(cacheKey, repoDetails);
  return repoDetails;
};

export const replaceMarkdownLinksWithStars = (
  markdown: string,
  cache: Map<string, RepoDetailsGithub>,
) => {
  const repoRegex =
    /\[([^\]]+)\]\(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)(?:\/[^)]*)?\)(.*)/g;

  return markdown.replace(
    repoRegex,
    (match, linkText: string, repoSlug: string, description: string) => {
      const repoDetails = cache.get(repoSlug);

      if (repoDetails) {
        return `⭐️ ${repoDetails.stargazers_count} [${linkText}](https://github.com/${repoSlug})${description}`;
      }

      return match; // leave unchanged if not found
    },
  );
};

export const main = async (useCache?: boolean) => {
  const markdown = await got(
    "https://raw.githubusercontent.com/rockerBOO/awesome-neovim/refs/heads/main/README.md",
  ).text();
  const repoInfos = getRepoNames(markdown);
  console.log(`Found ${repoInfos.length} repositories in markdown.`);

  if (useCache) {
    try {
      const cachedData = await fs.readFile("repoDetails.json", "utf-8");
      const cachedRepos: RepoDetailsGithub[] = JSON.parse(cachedData);
      for (const repo of cachedRepos) {
        const cacheKey = `${repo.owner.login}/${repo.name}`;
        reposCache.set(cacheKey, repo);
      }
      console.log(`Loaded ${reposCache.size} repositories from cache.`);
    } catch {
      console.warn("⚠️ Failed to load cache, proceeding without it.");
    }
  } else {
    console.log("Fetching repository details from GitHub...");
  }

  // uses p-queue to limit concurrency
  const repoDetailsList = await Promise.all(
    repoInfos.map(({ owner, repo }) =>
      queue.add(async () => {
        try {
          return await fetchAndCacheRepoDetails({ owner, repo });
        } catch (err) {
          console.warn(`⚠️ Failed to fetch ${owner}/${repo}: ${err.message}`);
          return null; // mark as failed
        }
      }),
    ),
  );
  // writes only the succesfull fetches to a file called repoDetails.json
  await fs.writeFile(
    "repoDetails.json",
    JSON.stringify(repoDetailsList.filter(Boolean), null, 2),
  );
  console.log("Repository details saved to repoDetails.json");

  console.log("Replacing markdown links with stargazer counts...");
  const updatedMarkdown = replaceMarkdownLinksWithStars(markdown, reposCache);
  await fs.writeFile("public/markdownWithStars.md", updatedMarkdown);
  console.log("Updated markdown saved to markdownWithStars.md");
};
