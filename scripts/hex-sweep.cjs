const fs = require("fs");
const path = require("path");
const root = path.resolve(process.cwd());
const REPL = [
  ["text-stone-900", "text-[#01011b]"],
  ["text-stone-800", "text-[#01011b]"],
  ["text-stone-700", "text-[#31263b]"],
  ["text-stone-600", "text-[#43394c]"],
  ["text-stone-500", "text-[#717a94]"],
  ["text-stone-400", "text-[#89828d]"],
  ["text-stone-300", "text-[#a9a4ad]"],
  ["text-stone-200", "text-[#c2bec6]"],
  ["bg-stone-100", "bg-[#ecedf2]"],
  ["bg-stone-50", "bg-[#f6f4f5]"],
  ["bg-stone-200", "bg-[#ecedf2]"],
  ["bg-stone-800", "bg-[#31263b]"],
  ["bg-stone-900", "bg-[#01011b]"],
  ["border-stone-200", "border-[#e4e0e6]"],
  ["border-stone-100", "border-[#ecedf2]"],
  ["border-stone-300", "border-[#dbd7da]"],
  ["bg-indigo-50 text-indigo-600", "bg-[#473982]/10 text-[#473982]"],
  ["bg-indigo-50 text-indigo-700", "bg-[#473982]/10 text-[#473982]"],
  ["text-indigo-600", "text-[#473982]"],
  ["text-indigo-500", "text-[#6f63b7]"],
  ["bg-indigo-500", "bg-[#473982]"],
];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(p); }
    else if (/.tsx$/.test(e.name)) {
      let s = fs.readFileSync(p, "utf8");
      const orig = s;
      for (const [a, b] of REPL) s = s.split(a).join(b);
      if (s !== orig) { fs.writeFileSync(p, s); console.log("patched " + path.relative(root, p)); }
    }
  }
}
walk(path.join(root, "src"));
console.log("done");
