(() => {
  const APP = document.currentScript?.dataset.appId || 'pixel-app';
  const SPECS = {
    pixelArt: ['pixel-art sprite', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. pixels is height rows of width palette indexes. Use transparent as -1.'],
    pixelText: ['pixel lettering or icon art', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. pixels is height rows of width palette indexes. Use transparent as -1.'],
    pixelTilemap: ['seamless pixel tile', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. Make the edges tile seamlessly. pixels is height rows of width palette indexes; transparent is -1.'],
    pixelDualTilemaps: ['seamless dual tilemap tile', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. Make the edges tile seamlessly and use clear readable shapes. pixels is height rows of width palette indexes; transparent is -1.'],
    pixelPose: ['2D character pose', 'Return JSON only: {"nodes":[{"id":"node-id","x":0,"y":0}]}. Only include IDs from the supplied skeleton. Coordinates are in the editor character-local coordinate system. Keep feet near ground and limb lengths plausible.'],
    pixelMusic: ['8-bit sound effect', 'Return JSON only: {"name":"short sound name","settings":{"attack":0,"sustain":0,"punch":0,"decay":0,"frequency":0,"slide":0,"deltaSlide":0,"vibratoEnable":false,"vibratoDepth":0,"vibratoSpeed":0,"arpEnable":false,"arpMult":1,"arpSpeed":0,"duty":50,"dutySweep":0,"waveform":"square","lpfEnable":false,"lpf":22050,"hpfEnable":false,"hpf":0,"gain":-10}}. Tune numbers to make the requested sound.'],
    pixelIsometric: ['isometric 3D scene', 'Return JSON only: {"objects":[{"type":"cube|sphere|cylinder|ramp|wall|building","position":[x,y,z],"scale":[x,y,z],"color":"#hex","name":"short name"}]}. Use at most 12 objects and coordinates between -8 and 8.'],
  };
  const spec = SPECS[APP];
  if (!spec) return;
  const style = document.createElement('style');
  style.textContent = `
    #pixel-ai-create-launch{position:fixed;right:18px;bottom:18px;z-index:9998;background:linear-gradient(135deg,#8b5cf6,#a855f7);color:#fff;border:1px solid #a855f7;border-radius:10px;padding:11px 16px;font:600 14px system-ui;box-shadow:0 6px 22px rgba(139,92,246,.4);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
    #pixel-ai-create-launch:hover{transform:translateY(-1px);box-shadow:0 8px 26px rgba(168,85,247,.5)}
    #pixel-ai-create{position:fixed;inset:0;z-index:9999;background:rgba(8,6,14,.74);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;font:14px system-ui;color:#e8e4f5;padding:18px}
    #pixel-ai-create.open{display:flex}
    #pixel-ai-create .card{background:linear-gradient(160deg,#1d1733 0%,#15111f 100%);border:1px solid #7c3aed;border-radius:14px;padding:24px;width:min(640px,92vw);max-height:86vh;overflow:auto;color:#e8e4f5;box-shadow:0 24px 70px rgba(0,0,0,.7),0 0 0 1px rgba(139,92,246,.18),0 0 34px rgba(124,58,237,.18)}
    #pixel-ai-create h2{margin:0 0 8px;font-size:22px;line-height:1.2;color:#b57bff;letter-spacing:.2px}
    #pixel-ai-create p{margin:0 0 14px;color:#b9b2cf;line-height:1.55}
    #pixel-ai-create textarea{box-sizing:border-box;width:100%;min-height:110px;padding:12px 14px;background:#211b35;border:1px solid #7c3aed;border-radius:8px;color:#f3f0ff;font:14px system-ui;line-height:1.5;resize:vertical;outline:none;transition:border-color .15s ease,box-shadow .15s ease}
    #pixel-ai-create textarea::placeholder{color:#8d84a8}
    #pixel-ai-create textarea:focus{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.22)}
    #pixel-ai-create pre{white-space:pre-wrap;word-break:break-word;max-height:36vh;overflow:auto;background:#221c36;border:1px solid #332a4d;padding:12px 14px;border-radius:8px;color:#d9d4ea;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5}
    #pixel-ai-create .card>div{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin:14px 0 10px}
    #pixel-ai-create button{padding:9px 14px;border-radius:8px;border:1px solid #3d3459;background:#2a2340;color:#e8e4f5;font:600 13px system-ui;cursor:pointer;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease}
    #pixel-ai-create button:hover:not(:disabled){background:#352b52;border-color:#5b4b82;transform:translateY(-1px)}
    #pixel-ai-create button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(168,85,247,.35)}
    #pixel-ai-create button:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
    #pixel-ai-create .generate{background:linear-gradient(135deg,#8b5cf6,#a855f7);border-color:#a855f7;color:#fff;box-shadow:0 4px 16px rgba(139,92,246,.35)}
    #pixel-ai-create .generate:hover:not(:disabled){background:linear-gradient(135deg,#9461ff,#b56bff);border-color:#b56bff;box-shadow:0 6px 20px rgba(168,85,247,.45)}
    #pixel-ai-create .apply:not(:disabled){background:#2b2148;border-color:#7c3aed;color:#c4b5fd}
    #pixel-ai-create .apply:hover:not(:disabled){background:#372a5c;border-color:#a855f7;color:#ede9fe}
    #pixel-ai-create .status{min-height:20px;margin:0 0 10px;color:#a79fc4;font-size:13px}
  `;
  document.head.appendChild(style);
  const launch = document.createElement('button'); launch.id='pixel-ai-create-launch'; launch.type='button'; launch.textContent='✦ AI Create';
  const modal = document.createElement('div'); modal.id='pixel-ai-create'; modal.innerHTML=`<section class="card" role="dialog" aria-modal="true" aria-labelledby="pixel-ai-title"><h2 id="pixel-ai-title">AI Create</h2><p>Describe what you want to make in ${spec[0]}. The generated result is previewed before it changes the editor.</p><textarea id="pixel-ai-prompt" placeholder="Describe what you want to create…"></textarea><div><button type="button" class="generate">Generate preview</button><button type="button" class="apply" disabled>Apply to editor</button><button type="button" class="close">Close</button></div><p class="status" role="status"></p><pre class="preview">Your preview will appear here.</pre></section>`;
  document.body.append(launch,modal);
  const status=modal.querySelector('.status'), preview=modal.querySelector('.preview'), apply=modal.querySelector('.apply');
  let result=null;
  launch.onclick=()=>modal.classList.add('open');
  modal.querySelector('.close').onclick=()=>modal.classList.remove('open');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
  modal.querySelector('.generate').onclick=async()=>{
    try{
      if(!window.PixelAIProvider) throw new Error('AI provider settings are unavailable. Refresh the page and try again.');
      const prompt=modal.querySelector('#pixel-ai-prompt').value.trim();
      if(!prompt) throw new Error('Describe what you want to create first.');
      status.textContent='Generating preview…'; apply.disabled=true;
      let context='';
      if(APP==='pixelPose'&&window.PixelPoseAIContext) context=' Current skeleton nodes: '+JSON.stringify(window.PixelPoseAIContext());
      const text=await window.PixelAIProvider.generateText(`Create ${spec[0]} for this request: ${prompt}.${context} ${spec[1]}`,'You generate safe, valid JSON for a creative editor. Return only one JSON object with no markdown fences.');
      result=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
      preview.textContent=JSON.stringify(result,null,2); apply.disabled=false; status.textContent='Preview ready. Review it, then apply it to the current document.';
    }catch(error){result=null;preview.textContent='No result.';status.textContent=error.message||String(error)}
  };
  apply.onclick=()=>{
    if(!result)return;
    try{
      if(['pixelArt','pixelText','pixelTilemap','pixelDualTilemaps'].includes(APP)) applyPixelGrid(result,APP);
      else { const adapter=window['PixelAIApply_'+APP]; if(typeof adapter!=='function')throw new Error('The editor AI adapter is not ready. Refresh the page and try again.'); adapter(result); }
      status.textContent='Applied to the editor.';
    }catch(error){status.textContent=error.message||String(error)}
  };
  function applyPixelGrid(data, appId){
    if(!Array.isArray(data.pixels)||!data.pixels.length||!Array.isArray(data.palette)||!data.palette.length)throw new Error('The generated pixel grid is incomplete. Generate another preview.');
    if(appId==='pixelArt'||appId==='pixelText'){
      const s=typeof State!=='undefined'?State:null, cm=typeof CanvasManager!=='undefined'?CanvasManager:null;
      const layer=s?.frames?.[s.currentFrameIndex]?.layers?.[s.activeLayerIndex];
      if(!layer?.data||!cm?.render)throw new Error('Could not find the active drawing layer.');
      const image=layer.data, w=image.width, h=image.height, pixels=data.pixels, palette=data.palette;
      const sourceH=pixels.length, sourceW=Math.max(...pixels.map(row=>Array.isArray(row)?row.length:0));
      if(!sourceW)throw new Error('The generated pixel grid is empty.');
      if(typeof InputHandler!=='undefined')InputHandler.saveState?.();
      image.data.fill(0);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const index=pixels[Math.floor(y*sourceH/h)]?.[Math.floor(x*sourceW/w)];
        if(index===-1||index===null||index===undefined)continue;
        const color=palette[Number(index)]; if(!color)continue;
        const hex=String(color).replace('#',''); if(!/^[0-9a-f]{6}$/i.test(hex))continue;
        const p=(y*w+x)*4; image.data[p]=parseInt(hex.slice(0,2),16);image.data[p+1]=parseInt(hex.slice(2,4),16);image.data[p+2]=parseInt(hex.slice(4,6),16);image.data[p+3]=255;
      }
      cm.render();
    }else{
      const s=typeof State!=='undefined'?State:null, layer=s?.layers?.[s.activeLayerIndex], canvas=layer?.canvas;
      if(!canvas)throw new Error('Could not find the active tile layer.');
      const ctx=canvas.getContext('2d'), pixels=data.pixels, palette=data.palette;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const index=pixels[Math.floor(y*pixels.length/canvas.height)]?.[Math.floor(x*Math.max(...pixels.map(r=>r.length))/canvas.width)];
        if(index===-1||index===null||index===undefined)continue;
        const color=palette[Number(index)]; if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1)}
      }
      if(typeof TilemapCore!=='undefined')TilemapCore.updatePreviews?.(); s.hasUnsavedChanges=true;
    }
  }
})();
