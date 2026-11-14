const DB_KEY="hm_beauty_sc_products_v3";
const CAT_KEY="hm_beauty_sc_categories_v1";
let products=loadProducts(),categories=loadCategories(),stream=null,scanActive=false,pendingPhoto="";
const $=id=>document.getElementById(id);

function loadProducts(){try{return JSON.parse(localStorage.getItem(DB_KEY)||"[]")}catch{return []}}
function loadCategories(){try{const a=JSON.parse(localStorage.getItem(CAT_KEY)||"[]");return Array.isArray(a)?a:[]}catch{return []}}
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(products));localStorage.setItem(CAT_KEY,JSON.stringify(categories));render()}catch(e){toast("مساحة التخزين ممتلئة. خفّض حجم الصور أو صدّر نسخة احتياطية.")}}
function saveCategories(){try{localStorage.setItem(CAT_KEY,JSON.stringify(categories));renderCategoryUI();render()}catch{toast("تعذر حفظ الفئات")}}
function money(n){return Number(n||0).toLocaleString("fr-MA",{minimumFractionDigits:2,maximumFractionDigits:2})+" DH"}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function catName(id){return categories.find(c=>c.id===id)?.name||"بدون فئة"}
function renderCategoryUI(){
 const filter=$("categoryFilter"),select=$("category");
 if(filter){const old=filter.value;filter.innerHTML='<option value="">جميع الفئات</option>'+categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");filter.value=categories.some(c=>c.id===old)?old:""}
 if(select){const old=select.value;select.innerHTML='<option value="">بدون فئة</option>'+categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");select.value=categories.some(c=>c.id===old)?old:""}
 const list=$("categoryList");
 if(list)list.innerHTML=categories.length?categories.map(c=>`<div class="category-item"><span>${esc(c.name)}</span><div><button type="button" class="secondary" data-cat-edit="${esc(c.id)}">تعديل</button><button type="button" class="secondary" data-cat-delete="${esc(c.id)}">حذف</button></div></div>`).join(""):'<p class="hint">لا توجد فئات بعد.</p>';
}
function render(){
 const q=$("search").value.trim().toLowerCase(),cat=$("categoryFilter")?.value||"";
 const filtered=products.filter(p=>(p.name||"").toLowerCase().includes(q)||(p.barcode||"").toLowerCase().includes(q)).filter(p=>!cat?p.categoryId===undefined||p.categoryId===null||p.categoryId===""||p.categoryId===cat||cat==="":p.categoryId===cat);
 $("productCount").textContent=products.length;
 $("stockValue").textContent=money(products.reduce((s,p)=>s+Number(p.buyPrice??p.price??0)*Number(p.quantity||0),0));
 $("profitValue").textContent=money(products.reduce((s,p)=>s+(Number(p.sellPrice??p.price??0)-Number(p.buyPrice??p.price??0))*Number(p.quantity||0),0));
 $("salesValue").textContent=money(products.reduce((s,p)=>s+Number(p.sellPrice??p.price??0)*Number(p.quantity||0),0));
 $("lowCount").textContent=products.filter(p=>Number(p.quantity)<=Number(p.threshold??3)).length;
 $("resultCount").textContent=filtered.length+" منتج";$("empty").style.display=filtered.length?"none":"block";
 $("products").innerHTML=filtered.map(p=>{const buy=Number(p.buyPrice??p.price??0),sell=Number(p.sellPrice??p.price??0),low=Number(p.quantity)<=Number(p.threshold??3);return `<article class="product"><div class="product-main">${p.photo?`<img class="product-photo zoomable-photo" src="${p.photo}" alt="صورة ${esc(p.name)}" data-photo="${esc(p.id)}" role="button" tabindex="0" title="اضغط لتكبير الصورة">`:`<div class="product-photo placeholder">HM</div>`}<div class="product-info"><h3>${esc(p.name)}</h3><div class="meta">${p.barcode?"الباركود: "+esc(p.barcode):"بدون باركود"} • ${esc(catName(p.categoryId))}</div><div class="stock ${low?"low":""}">الكمية: ${Number(p.quantity)||0} ${low?"• مخزون منخفض":""}</div></div></div><div class="prices"><div>البيع <b>${money(sell)}</b></div><div>الشراء <b>${money(buy)}</b></div><div class="unit-profit">ربح القطعة <b>${money(sell-buy)}</b></div></div><div class="product-actions"><button class="secondary" data-edit="${esc(p.id)}">تعديل</button><button class="secondary" data-sell="${esc(p.id)}">− قطعة</button><button class="secondary" data-delete="${esc(p.id)}">حذف</button></div></article>`}).join("");
}
function openForm(p=null){
 $("productForm").reset();pendingPhoto=p?.photo||"";$("productId").value=p?.id||"";
 $("formTitle").textContent=p?"تعديل المنتج":"إضافة منتج";$("name").value=p?.name||"";
 $("barcode").value=p?.barcode||"";$("buyPrice").value=p?.buyPrice??p?.price??"";
 $("sellPrice").value=p?.sellPrice??p?.price??"";$("quantity").value=p?.quantity??0;
 $("threshold").value=p?.threshold??3;renderCategoryUI();$("category").value=p?.categoryId||"";
 updatePhotoPreview();updateProfit();$("productDialog").showModal();
}
function updatePhotoPreview(){$("photoPreview").src=pendingPhoto||"";$("photoPreview").style.display=pendingPhoto?"block":"none"}
function updateProfit(){$("unitProfit").textContent=money(Number($("sellPrice").value||0)-Number($("buyPrice").value||0))}
$("addBtn").onclick=$("navAdd").onclick=()=>openForm();
$("closeDialog").onclick=$("cancelForm").onclick=()=>$("productDialog").close();
$("buyPrice").oninput=$("sellPrice").oninput=updateProfit;
$("photo").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")){toast("اختر ملف صورة صحيحاً");return}try{pendingPhoto=await compressImage(f);updatePhotoPreview()}catch{toast("تعذرت قراءة الصورة")}};
function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const scale=Math.min(1,640/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL("image/jpeg",.62))};img.onerror=reject;img.src=url})}
$("removePhoto").onclick=()=>{pendingPhoto="";$("photo").value="";updatePhotoPreview()};
$("productForm").onsubmit=e=>{
 e.preventDefault();const id=$("productId").value||String(Date.now());
 const item={id,name:$("name").value.trim(),barcode:$("barcode").value.trim(),buyPrice:Number($("buyPrice").value),sellPrice:Number($("sellPrice").value),quantity:Math.max(0,Number($("quantity").value)),threshold:Math.max(0,Number($("threshold").value)),photo:pendingPhoto,categoryId:$("category").value||""};
 if(!item.name||!Number.isFinite(item.buyPrice)||!Number.isFinite(item.sellPrice)){toast("تحقق من الاسم والأثمان");return}
 if(item.sellPrice<item.buyPrice&&!confirm("ثمن البيع أقل من ثمن الشراء. هل تريد الحفظ؟"))return;
 const duplicate=products.find(p=>p.barcode&&p.barcode===item.barcode&&p.id!==id);
 if(duplicate){toast("هذا الباركود مسجل لمنتج آخر");return}
 const i=products.findIndex(p=>p.id===id);if(i>=0)products[i]=item;else products.unshift(item);
 save();$("productDialog").close();toast("تم حفظ المنتج");
};
$("products").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 const p=products.find(x=>x.id===b.dataset.edit||x.id===b.dataset.sell||x.id===b.dataset.delete);if(!p)return;
 if(b.dataset.edit)openForm(p);
 if(b.dataset.sell){if(p.quantity>0){p.quantity--;save();toast("تم تسجيل بيع قطعة واحدة")}else toast("الكمية صفر")}
 if(b.dataset.delete&&confirm("هل تريد حذف "+p.name+"؟")){products=products.filter(x=>x.id!==p.id);save();toast("تم حذف المنتج")}
};
$("products").addEventListener("click",e=>{
 const img=e.target.closest(".zoomable-photo");if(!img)return;
 const p=products.find(x=>x.id===img.dataset.photo);if(!p?.photo)return;
 $("largeProductPhoto").src=p.photo;$("largePhotoTitle").textContent=p.name||"صورة المنتج";
 $("largePhotoDialog").showModal();
});
$("products").addEventListener("keydown",e=>{
 if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("zoomable-photo")){e.preventDefault();e.target.click()}
});
$("closeLargePhoto").onclick=()=>$("largePhotoDialog").close();
$("largePhotoDialog").addEventListener("click",e=>{if(e.target===$("largePhotoDialog"))$("largePhotoDialog").close()});
$("search").oninput=render;$("categoryFilter").onchange=render;

$("manageCategoriesBtn").onclick=()=>{$("categoryDialog").showModal();renderCategoryUI()};
$("closeCategoryDialog").onclick=()=>$("categoryDialog").close();
$("categoryForm").onsubmit=e=>{
 e.preventDefault();const name=$("newCategoryName").value.trim();if(!name)return;
 if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast("هذه الفئة موجودة بالفعل");return}
 categories.push({id:"cat_"+Date.now(),name});$("newCategoryName").value="";saveCategories();toast("تمت إضافة الفئة");
};
$("categoryList").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 const c=categories.find(x=>x.id===b.dataset.catEdit||x.id===b.dataset.catDelete);if(!c)return;
 if(b.dataset.catEdit){const name=prompt("اكتب الاسم الجديد للفئة:",c.name);if(name&&name.trim()){if(categories.some(x=>x.id!==c.id&&x.name.toLowerCase()===name.trim().toLowerCase())){toast("اسم الفئة مستخدم بالفعل");return}c.name=name.trim();saveCategories();toast("تم تعديل الفئة")}}
 if(b.dataset.catDelete&&confirm("حذف فئة «"+c.name+"»؟ المنتجات التابعة لها ستصبح بدون فئة.")){products.forEach(p=>{if(p.categoryId===c.id)p.categoryId=""});categories=categories.filter(x=>x.id!==c.id);save();saveCategories();toast("تم حذف الفئة")}
};

function backup(){
 const blob=new Blob([JSON.stringify({app:"HM BEAUTY SC",version:4,createdAt:new Date().toISOString(),products,categories},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="HM-BEAUTY-SC-Backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("تم تنزيل النسخة الاحتياطية مع الفئات والصور");
}
$("backupBtn").onclick=$("backupTop").onclick=$("navBackup").onclick=backup;
$("restoreBtn").onclick=()=>$("restoreFile").click();
$("restoreFile").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  const data=JSON.parse(await f.text()),arr=Array.isArray(data)?data:data.products;
  if(!Array.isArray(arr)||!arr.every(p=>p&&p.name!==undefined&&(p.quantity!==undefined)))throw Error("invalid");
  if(!confirm("سيتم استبدال قائمة المنتجات والفئات الحالية. هل تريد المتابعة؟"))return;
  products=arr.map((p,i)=>({id:String(p.id||Date.now()+i),name:String(p.name),barcode:String(p.barcode||""),buyPrice:Number(p.buyPrice??p.price??0),sellPrice:Number(p.sellPrice??p.price??0),quantity:Number(p.quantity||0),threshold:Number(p.threshold??3),photo:p.photo||"",categoryId:String(p.categoryId||"")}));
  categories=Array.isArray(data.categories)?data.categories.filter(c=>c&&c.id&&c.name).map(c=>({id:String(c.id),name:String(c.name)})):[];
  save();saveCategories();toast("تم استرجاع المنتجات والفئات والصور");
 }catch{toast("ملف النسخة الاحتياطية غير صالح")}e.target.value="";
};
async function stopScanner(){scanActive=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("video").srcObject=null}
async function startScanner(){
 if(!("BarcodeDetector"in window)){toast("المتصفح لا يدعم المسح؛ أدخل الباركود يدوياً");return}
 try{
  const detector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"]});
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
  $("video").srcObject=stream;$("scannerDialog").showModal();await $("video").play();scanActive=true;
  $("scanMessage").textContent="وجّه الكاميرا نحو الباركود.";
  const tick=async()=>{if(!scanActive)return;try{const codes=await detector.detect($("video"));if(codes.length){const code=codes[0].rawValue;await stopScanner();$("scannerDialog").close();$("search").value=code;render();const found=products.find(p=>p.barcode===code);if(found)showScanResult(found,code);else{openForm();$("barcode").value=code;toast("باركود جديد: أكمل بيانات المنتج")}return}}catch{}requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
 }catch{toast("تعذر تشغيل الكاميرا. اسمح بالوصول للكاميرا وافتح التطبيق عبر HTTPS")}
}
$("scanBtn").onclick=startScanner;$("scanFromForm").onclick=async()=>{await startScanner()};
$("closeScanner").onclick=async()=>{await stopScanner();$("scannerDialog").close()};
$("manualBarcode").onclick=async()=>{await stopScanner();$("scannerDialog").close();const code=prompt("أدخل رقم الباركود:");if(code){$("search").value=code;render();const found=products.find(p=>p.barcode===code);if(found)showScanResult(found,code);else{openForm();$("barcode").value=code}}};
$("scannerDialog").addEventListener("close",stopScanner);
function showScanResult(p,code){$("scanResultPhoto").src=p.photo||"";$("scanResultPhoto").style.display=p.photo?"block":"none";$("scanProductName").textContent=p.name;$("scanProductPrice").textContent=money(p.sellPrice??p.price);$("scanProductBuy").textContent=money(p.buyPrice??p.price);$("scanProductQty").textContent=p.quantity+" قطعة";$("scanProductCode").textContent=code;$("scanResultDialog").showModal()}
$("closeScanResult").onclick=$("scanResultDone").onclick=()=>$("scanResultDialog").close();
renderCategoryUI();render();
if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
