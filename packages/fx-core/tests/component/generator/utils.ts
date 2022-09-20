import path from "path";
import fs from "fs-extra";

export function compareDirs(dir1: string, dir2: string) {
  const files1 = fs.readdirSync(dir1);
  const files2 = fs.readdirSync(dir2);
  if (files1.length !== files2.length) {
    return false;
  }
  for (const file of files1) {
    if (!files2.includes(file)) {
      console.log(`File ${file} not in ${dir2}`);
      return false;
    }
    const filePath1 = path.join(dir1, file);
    const filePath2 = path.join(dir2, file);
    if (fs.statSync(filePath1).isDirectory()) {
      if (!compareDirs(filePath1, filePath2)) {
        return false;
      }
    } else {
      const file1 = fs.readFileSync(filePath1).toString().replace(/\r/g, "");
      const file2 = fs.readFileSync(filePath2).toString().replace(/\r/g, "");
      if (file1.toString() != file2.toString()) {
        console.log(`Files ${filePath1} and ${filePath2} are different`);
        return false;
      }
    }
  }
  return true;
}
