import { main } from "./updateStargazers.ts";

main(Boolean(process.env.USE_CACHE)).catch((error) => {
  console.error(error);
  process.exit(1);
});
