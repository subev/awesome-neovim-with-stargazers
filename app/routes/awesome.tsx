import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import markdownData from "../../public/markdownWithStars.md?raw";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeExternalLinks from "rehype-external-links";

export default function Awesome() {
  return (
    <div className="prose prose-sm prose-a:text-blue-600 max-w-none p-5 prose-ul:marker:text-gray-500">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeAutolinkHeadings,
          rehypeSlug,
          [
            rehypeExternalLinks,
            { target: "_blank", rel: ["noopener", "noreferrer"] },
          ],
        ]}
      >
        {markdownData || ""}
      </ReactMarkdown>
    </div>
  );
}
