// scripts/runParser.ts
import { runParser } from "../parser";
console.log("START PARSER");
runParser()
  .then(console.log)
  .catch(console.error);
  console.log("DONE:")