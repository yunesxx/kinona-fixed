(function(){
  // استخدام absolute URL لـ start_url لتجنب خطأ "URL is invalid" مع blob manifests
  const origin = location.origin;
  const m={name:"Kinona",short_name:"Kinona",start_url: origin + "/",display:"standalone",
    orientation:"portrait",background_color:"#ff6b35",theme_color:"#ff6b35",
    scope: origin + "/",
    icons:[
      {src:"https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/kinona_icon_192.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
      {src:"https://eoojsidkxylbbjkvsyuz.supabase.co/storage/v1/object/public/posts/kinona_icon_512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}
    ]};
  const b=new Blob([JSON.stringify(m)],{type:'application/manifest+json'});
  document.getElementById('pwa-manifest').href=URL.createObjectURL(b);
})();
