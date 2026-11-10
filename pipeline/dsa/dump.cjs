// node pipeline/dsa/dump.cjs <dryrun-dir> > out.json : loads DryRun's data files exactly like the browser (see DryRun tools/dump.js)
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=process.argv[2];
const ctx={};ctx.window=ctx;vm.createContext(ctx);
const dir=path.join(root,'js','data');
const files=['boot.js',...fs.readdirSync(dir).filter(x=>/^p\d+\.js$/.test(x)).sort(),'tracks.js'];
for(const f of files)vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
process.stdout.write(JSON.stringify({P:ctx.DR.P,T:ctx.DR.T}));
