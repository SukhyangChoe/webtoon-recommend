import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function files(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]):[];}
const leaks=[];
for(const file of files(path.join(root,'src')).filter(f=>/\.[jt]sx?$/.test(f))){
 const source=fs.readFileSync(file,'utf8');
 if(/^\s*["']use client["']/.test(source)&&/from\s*["'][^"']*(?:data\/webtoons|webtoons_seed)/.test(source))leaks.push(path.relative(root,file));
}
const chunkRoot=path.join(root,process.env.NEXT_DIST_DIR||'.next','static','chunks');
for(const file of files(chunkRoot).filter(f=>f.endsWith('.js'))){
 const source=fs.readFileSync(file,'utf8');
 if(/qualityReauditSourceFile|precisionReauditRecords|characterExecutionQuality|lezhinWorkABAuthoritative537/.test(source))leaks.push(path.relative(root,file));
}
if(leaks.length){console.error(JSON.stringify({error:'PRIVATE_CATALOG_IN_CLIENT',files:leaks}));process.exitCode=1;}
else console.log(JSON.stringify({ok:true,check:'No raw catalog imports or private audit markers in public client chunks'}));
