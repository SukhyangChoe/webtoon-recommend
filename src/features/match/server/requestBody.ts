import 'server-only';

/** Content-Length is not trusted: enforce the limit on actual bytes, too. */
export async function readMatchJson(request: Request, limit = 128 * 1024, timeoutMs = 5000) {
  const reader=request.body?.getReader();
  if(!reader)throw new SyntaxError('EMPTY_REQUEST_BODY');
  const chunks:Uint8Array[]=[];let total=0;
  let timer: ReturnType<typeof setTimeout> | undefined, timedOut=false;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new Error('REQUEST_BODY_TIMEOUT'));void reader.cancel().catch(()=>{});},timeoutMs);});
  try{
    for(;;){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;total+=value.byteLength;
      if(total>limit){void reader.cancel().catch(()=>{});throw new Error('REQUEST_BODY_TOO_LARGE');}
      chunks.push(value);
    }
  }finally{clearTimeout(timer);reader.releaseLock();}
  if(timedOut)throw new Error('REQUEST_BODY_TIMEOUT');
  const body=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(body));
}
