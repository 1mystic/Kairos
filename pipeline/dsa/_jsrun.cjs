// reads {code, tests:[jt...]} on stdin, prints JSON [{ok,json,err}] (mirrors DryRun tools/checkjs.js)
const AF=Object.getPrototypeOf(async function(){}).constructor;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let buf='';process.stdin.on('data',d=>buf+=d).on('end',async()=>{
  const d=JSON.parse(buf),out=[];
  for(const t of d.tests){
    try{
      const fn=new AF('sleep',d.code+'\n'+t);
      const got=await Promise.race([fn(sleep),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),5000))]);
      const s=JSON.stringify(got);
      out.push({ok:true,json:s===undefined?null:s});
    }catch(e){out.push({ok:false,err:String(e&&e.message||e).slice(0,200)});}
  }
  process.stdout.write(JSON.stringify(out));process.exit(0);
});
