import { main } from "./updateStargazers.ts";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
