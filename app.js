const kindLabels={university:'Universität / Hochschule',ihk:'IHK',agency:'Agentur für Arbeit',company:'Unternehmen'};
const $=s=>document.querySelector(s);const statusLabels={'لم يتم التواصل': 'Noch nicht kontaktiert', 'تم الإرسال': 'Gesendet', 'انتظار الرد': 'Antwort ausstehend', 'تم الرد': 'Beantwortet', 'وثائق مطلوبة': 'Unterlagen angefordert', 'غير متاح': 'Nicht verfügbar'};const key='masari-ausbildung-v1';let state={contacts:[],profile:{study:'2. Studienjahr · DEUG voraussichtlich dieses Studienjahr',language:'Deutsch B2 · Juli oder August (geplant)'}};function validatedData(input){
 if(!input || !Array.isArray(input.contacts) || !input.profile || typeof input.profile.study!=='string' || typeof input.profile.language!=='string')throw new Error('Ungültige Sicherungsdatei');
 const ids=new Set();
 const contacts=input.contacts.map(c=>{
  if(!c || typeof c.name!=='string' || !c.name.trim() || !Object.hasOwn(statusLabels,c.status))throw new Error('Ungültige Einrichtung');
  const result={};
  for(const field of ['name','city','field','email','url','status','followup','notes','kind','sentAt']){if(c[field]!=null && typeof c[field]!=='string')throw new Error('Ungültiges Feld');result[field]=c[field]||'';}
  result.id=typeof c.id==='string' && /^[a-zA-Z0-9_-]+$/.test(c.id) && !ids.has(c.id)?c.id:crypto.randomUUID();ids.add(result.id);
  return result;
 });
 return {contacts,profile:{study:input.profile.study,language:input.profile.language},appliedBatches:Array.isArray(input.appliedBatches)?input.appliedBatches.filter(x=>typeof x==='string'):[]};
}
let loadFailed=false;
try{const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw);for(const c of saved.contacts||[])if(c.status==='لم يKontaktiert')c.status='لم يتم التواصل';state=validatedData(saved);}}catch{loadFailed=true;}
if(state.profile.study==='السنة الثانية · DEUG متوقع هاد العام')state.profile.study='2. Studienjahr · DEUG voraussichtlich dieses Studienjahr';if(state.profile.language==='الألمانية B2 · يوليوز أو غشت (موعد مستهدف)')state.profile.language='Deutsch B2 · Juli oder August (geplant)';let editing=null,filter='all',messageContact=null,lang='de',drafts={};const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3000)}function save(){if(loadFailed){toast('Gespeicherte Daten konnten nicht geladen werden. Bitte zuerst eine gültige Sicherung importieren.');return false;}try{localStorage.setItem(key,JSON.stringify(state));render();return true;}catch{toast('Speichern fehlgeschlagen. Bitte Daten exportieren und erneut versuchen.');return false;}}
function render(){$('#studyDisplay').textContent=state.profile.study;$('#languageDisplay').textContent=state.profile.language;$('#totalBadge').textContent=state.contacts.length;const counts=[['Kontakte',state.contacts.length,'▦'],['Kontaktiert',state.contacts.filter(c=>c.status!=='لم يتم التواصل').length,'↗'],['Antwort ausstehend',state.contacts.filter(c=>['تم الإرسال','انتظار الرد'].includes(c.status)).length,'◷'],['Rückmeldungen',state.contacts.filter(c=>['تم الرد','وثائق مطلوبة','غير متاح'].includes(c.status)).length,'✉']];$('#stats').innerHTML=counts.map(([t,n,i])=>`<div class="stat"><div><small>${t}</small><b>${n.toLocaleString('de-DE')}</b></div><span class="icon">${i}</span></div>`).join('');const q=$('#search').value.trim().toLowerCase();const list=state.contacts.filter(c=>(filter==='all'||(filter==='انتظار الرد'?['تم الإرسال','انتظار الرد'].includes(c.status):c.status===filter))&&(!$('#kindFilter').value||c.kind===$('#kindFilter').value)&&[c.name,c.city,c.field,c.email].join(' ').toLowerCase().includes(q));$('#contactList').innerHTML=list.length?list.map(c=>`<article class="contact"><div class="logo">▥</div><div class="info"><span class="contact-kind">${esc(kindLabels[c.kind]||'Kontakt')}</span><h3>${esc(c.name)}</h3><p>${esc(c.city||'Stadt nicht angegeben')} · ${esc(c.field||'Fach nicht angegeben')}</p>${contactDetails(c)}</div><label class="quick-status"><span>Status</span><select data-status="${esc(c.id)}" aria-label="Status: ${esc(c.name)}">${Object.entries(statusLabels).map(([value,label])=>`<option value="${esc(value)}" ${value===c.status?'selected':''}>${esc(label)}</option>`).join('')}</select></label><button data-message="${esc(c.id)}">✉ Nachricht</button><button data-edit="${esc(c.id)}">Bearbeiten ↗</button></article>`).join(''):`<div class="empty"><div class="empty-icon">▧</div><h3>${state.contacts.length?'Keine passenden Ergebnisse':'Deine erste Chance beginnt mit einer Anfrage'}</h3><p>${state.contacts.length?'Ändere den Suchbegriff oder Filter.':'Füge eine Universität oder Firma hinzu und bereite deine Anfrage auf Deutsch vor.'}</p>${state.contacts.length?'':'<button class="primary" id="emptyAdd">＋ Erste Einrichtung hinzufügen</button>'}</div>`;$('#emptyAdd')?.addEventListener('click',()=>openContact());document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openContact(b.dataset.edit));document.querySelectorAll('[data-message]').forEach(b=>b.onclick=()=>openMessage(b.dataset.message));document.querySelectorAll('[data-status]').forEach(select=>select.onchange=()=>{const contact=state.contacts.find(c=>c.id===select.dataset.status);if(!contact)return;const previous=contact.status;contact.status=select.value;if(save())toast('Status aktualisiert');else{contact.status=previous;select.value=previous;}})}
function openContact(id){editing=id||null;const form=$('#contactForm');form.reset();$('#contactDialog h2').textContent=id?'Einrichtung bearbeiten':'Einrichtung hinzufügen';$('#deleteContact').hidden=!id;if(id){const c=state.contacts.find(c=>c.id===id);for(const [k,v]of Object.entries(c))if(form.elements[k])form.elements[k].value=v}$('#contactDialog').showModal()}
$('#addTop').onclick=()=>openContact();$('#contactForm').onsubmit=e=>{e.preventDefault();const c={...(state.contacts.find(x=>x.id===editing)||{}),...Object.fromEntries(new FormData(e.target))};c.name=c.name.trim();if(!c.name)return; c.id=editing||crypto.randomUUID();const before=state.contacts;if(editing)state.contacts=state.contacts.map(x=>x.id===editing?c:x);else state.contacts=[...state.contacts,c];if(!save()){state.contacts=before;return;}$('#contactDialog').close();toast('Einrichtung gespeichert')};$('#deleteContact').onclick=()=>{if(confirm('Diese Einrichtung und ihre Notizen wirklich löschen?')){const before=state.contacts;state.contacts=state.contacts.filter(c=>c.id!==editing);if(save())$('#contactDialog').close();else state.contacts=before}};document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#search').oninput=render;$('#kindFilter').onchange=render;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render()});$('#editProfile').onclick=()=>{for(const [k,v]of Object.entries(state.profile))$('#profileForm').elements[k].value=v;$('#profileDialog').showModal()};$('#profileForm').onsubmit=e=>{e.preventDefault();const before=state.profile;state.profile=Object.fromEntries(new FormData(e.target));if(save()){$('#profileDialog').close();toast('Profil gespeichert');}else state.profile=before};
function message(){if($('#messageType').value==='university')return universityMessage();const field=messageContact?.field||'[Ausbildungsberuf]';const name=$('#senderName').value.trim()||'Hassan Boufous';return lang==='de'?`Betreff: Anfrage zu Ausbildungsmöglichkeiten – ${field}\n\nSehr geehrte Damen und Herren,\n\nmein Name ist ${name}, ich bin 21 Jahre alt und lebe derzeit in Marokko. Mein marokkanisches Baccalauréat habe ich 2023 erworben. Ich studiere im zweiten Jahr an der Fakultät für Rechts-, Wirtschafts- und Sozialwissenschaften Ain Chock in Marokko im Bereich Wirtschaft und Management. Ich werde voraussichtlich in diesem Studienjahr mein DEUG erwerben.\n\nIch lerne derzeit Deutsch und strebe an, im Juli oder August ein B2-Zertifikat zu erwerben.\n\nIch interessiere mich für eine Ausbildung im Bereich ${field} bei ${messageContact?.name||'[Unternehmen / Einrichtung]'}. Könnten Sie mir bitte mitteilen, ob eine Bewerbung mit meinem Bildungsweg grundsätzlich möglich ist?\n\nWelche schulischen und sprachlichen Voraussetzungen gelten? Welche Unterlagen, Bewerbungsfristen und Ausbildungsstarttermine sind zu beachten? Nehmen Sie auch Bewerbungen von Personen entgegen, die derzeit in Marokko leben?\n\nGerne reiche ich bei Bedarf meinen Lebenslauf und meine Zeugnisse ein.\n\nVielen Dank für Ihre Zeit und Ihre Rückmeldung.\n\nMit freundlichen Grüßen\n${name}`:`الموضوع: الاستفسار عن فرص التكوين المهني – ${field}\n\nالسيدات والسادة المحترمون،\n\nاسمي ${name}، وعمري 21 سنة وأقيم حالياً في المغرب. حصلت على البكالوريا المغربية سنة 2023. أدرس في السنة الثانية بكلية العلوم القانونية والاقتصادية والاجتماعية عين الشق بالمغرب، في مجال الاقتصاد والتدبير. ومن المتوقع أن أحصل على دبلوم DEUG خلال هذه السنة الدراسية.\n\nأتعلم اللغة الألمانية حالياً، وأهدف إلى الحصول على شهادة B2 في يوليوز أو غشت.\n\nأهتم بالتكوين المهني في مجال ${field} لدى ${messageContact?.name||'[اسم المؤسسة]'}. هل يمكنكم إخباري إن كان مساري الدراسي يسمح لي مبدئياً بتقديم طلب؟\n\nما الشروط الدراسية واللغوية المطلوبة؟ وما الوثائق وآجال الترشح ومواعيد بداية التكوين؟ وهل تستقبلون طلبات من أشخاص يقيمون حالياً بالمغرب؟\n\nيمكنني تقديم سيرتي الذاتية وشواهدي عند الحاجة.\n\nشكراً على وقتكم وعلى جوابكم.\n\nمع خالص التحية،\n${name==='[Ihr Name]'?'[الاسم الكامل]':name}`}
function draftKey(){return $('#messageType').value+':'+lang;}
function rememberDraft(){drafts[draftKey()]=$('#messageText').value;}
function updateMessage(){$('#messageText').value=drafts[draftKey()]??message();$('#messageText').dir=lang==='de'?'ltr':'rtl';$('#messageText').lang=lang;$('#german').classList.toggle('selected',lang==='de');$('#arabic').classList.toggle('selected',lang==='ar');}
function openMessage(id){messageContact=state.contacts.find(c=>c.id===id)||null;drafts={};lang='de';$('#messageType').value=messageContact && ['ihk','agency','company'].includes(messageContact.kind)?'ausbildung':'university';$('#messageRecipient').textContent=messageContact?'Empfänger: '+messageContact.name+(messageContact.email?' · '+messageContact.email:' · E-Mail-Adresse fehlt'):'Allgemeine Vorlage · Wähle eine Einrichtung, um eine E-Mail zu öffnen.';updateMessage();$('#messageDialog').showModal();}
$('#templateNav').onclick=()=>openMessage();
$('#german').onclick=()=>{rememberDraft();lang='de';updateMessage();};
$('#arabic').onclick=()=>{rememberDraft();lang='ar';updateMessage();};
$('#messageText').oninput=rememberDraft;
$('#messageType').onchange=updateMessage;
$('#senderName').oninput=()=>{$('#regenerate').hidden=false;};
$('#regenerate').onclick=()=>{if(confirm('Vorlagen mit diesem Namen neu erstellen? Deine Textänderungen in beiden Sprachen werden verworfen.')){drafts={};updateMessage();$('#regenerate').hidden=true;}};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#messageText').value);toast('Nachricht kopiert')}catch{$('#messageText').select();toast('Nachricht markiert. Bitte mit deinem Gerät kopieren.')}};$('#emailMessage').onclick=()=>{if(!messageContact?.email){toast('Bitte zuerst eine E-Mail-Adresse bei der Einrichtung hinterlegen.');return}const content=$('#messageText').value;location.href=`mailto:${encodeURIComponent(messageContact.email)}?subject=${encodeURIComponent(content.split('\n')[0])}&body=${encodeURIComponent(content.split('\n').slice(2).join('\n'))}`};$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='masari-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Datensicherung exportiert')};seedConversationContacts();render();if(loadFailed)toast('Gespeicherte Daten konnten nicht geladen werden. Bitte Sicherung importieren.');

function universityMessage(){
const name=$('#senderName').value.trim()||'Hassan Boufous';
return lang==='de'?`Betreff: Anfrage zu Studienmöglichkeiten mit einem marokkanischen DEUG – Wirtschaft und Management

Sehr geehrte Damen und Herren,

mein Name ist ${name}, ich bin 21 Jahre alt und lebe derzeit in Marokko. Mein marokkanisches Baccalauréat habe ich 2023 erworben. Ich studiere im zweiten Jahr im Bereich Wirtschaft und Management an der Faculté des Sciences Juridiques, Économiques et Sociales Aïn Chock in Marokko. Voraussichtlich werde ich in diesem Studienjahr mein DEUG (Diplôme d’études universitaires générales) erwerben.

Ich interessiere mich für ein Bachelorstudium im Bereich Betriebswirtschaftslehre oder in einem verwandten wirtschaftswissenschaftlichen Fach an Ihrer Hochschule und möchte mich zunächst über meine Studienmöglichkeiten informieren.

Derzeit lerne ich Deutsch. Mein Ziel ist es, im Juli oder August ein B2-Zertifikat zu erwerben; das Zertifikat liegt mir noch nicht vor.

Könnten Sie mir bitte zu folgenden Fragen Auskunft geben?

• Ist mit meinem marokkanischen Schulabschluss und meinem geplanten DEUG grundsätzlich eine Bewerbung möglich? Welche Nachweise benötigen Sie für die Prüfung der Hochschulzugangsberechtigung?
• Kann ich mich für ein höheres Fachsemester bewerben und bereits erbrachte Studienleistungen anerkennen lassen, oder wäre eine Bewerbung für das erste Fachsemester erforderlich?
• Welche Deutschkenntnisse und anerkannten Sprachzertifikate werden für die Bewerbung und die Einschreibung verlangt? Reicht B2 aus oder ist ein höheres Niveau erforderlich? Gibt es gegebenenfalls einen studienvorbereitenden Sprachkurs?
• Welche Bewerbungsfristen, Unterlagen und Übersetzungen sind erforderlich? Erfolgt die Bewerbung direkt bei Ihnen oder über uni-assist?

Bei Bedarf kann ich Ihnen meine bisherigen Notenübersichten und weitere Nachweise zur Prüfung zukommen lassen. Falls eine andere Stelle zuständig ist, wäre ich Ihnen für einen entsprechenden Kontakt dankbar.

Vielen Dank für Ihre Unterstützung.

Mit freundlichen Grüßen
${name}`:`الموضوع: الاستفسار عن إمكانية الدراسة بدبلوم DEUG مغربي – الاقتصاد والتدبير

السيدات والسادة المحترمون،

اسمي ${name}، وعمري 21 سنة وأقيم حالياً في المغرب. حصلت على البكالوريا المغربية سنة 2023. أدرس في السنة الثانية في مجال الاقتصاد والتدبير بكلية العلوم القانونية والاقتصادية والاجتماعية عين الشق بالمغرب. ومن المتوقع أن أحصل على دبلوم DEUG خلال هذه السنة الدراسية.

أرغب في الاستفسار عن إمكانية دراسة البكالوريوس في إدارة الأعمال أو تخصص قريب من العلوم الاقتصادية بجامعتكم.

أتعلم الألمانية حالياً وأهدف للحصول على شهادة B2 في يوليوز أو غشت، ولم أحصل عليها بعد.

أرجو إفادتي بخصوص ما يلي:

• هل تسمح شهادتي المدرسية المغربية ودبلوم DEUG المتوقع بتقديم طلب مبدئياً؟ وما الوثائق اللازمة لتقييم أهليتي للدراسة الجامعية؟
• هل يمكن الترشح لفصل دراسي متقدم ومعادلة المواد التي اجتزتها، أم يلزم الترشح للفصل الأول؟
• ما مستوى الألمانية والشهادات المعتمدة المطلوبة عند الترشح والتسجيل؟ هل يكفي B2 أم يلزم مستوى أعلى؟ وهل تتوفر دورة لغة تحضيرية؟
• ما آجال الترشح والوثائق والترجمات المطلوبة؟ وهل يتم الترشح مباشرة أم عبر uni-assist؟

يمكنني تقديم كشوف النقط والوثائق الأخرى عند الحاجة. وإذا كانت جهة أخرى مختصة، أرجو تزويدي ببيانات التواصل معها.

شكراً على مساعدتكم.

مع خالص التحية،
${name==='[Ihr vollständiger Name]'?'[الاسم الكامل]':name}`;
}

function contactDetails(c){
 let website='';try{const url=new URL(c.url);if(['https:','http:'].includes(url.protocol))website=`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Website ↗</a>`;}catch{}
 let reminder='';
 if(/^\d{4}-\d{2}-\d{2}$/.test(c.followup)){
  const today=new Date();const localDay=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const due=c.followup<=localDay;const label=c.followup===localDay?'Heute nachfassen':c.followup<localDay?'Nachfassen überfällig':'Nachfassen';
  reminder=`<span class="reminder ${due?'due':''}">${label}: ${esc(new Date(c.followup+'T12:00:00').toLocaleDateString('de-DE'))}</span>`;
 }
 const email=c.email?`<span class="contact-email">${esc(c.email)}</span>`:'';
 const sent=c.sentAt?`<span>Gesendet am ${esc(c.sentAt)}</span>`:'';
 const note=c.notes?`<details class="contact-notes"><summary>Notizen / Rückmeldung</summary><p>${esc(c.notes)}</p></details>`:'';
 return `<div class="contact-details">${website}${email}${sent}${reminder}</div>${note}`;
}
$('#import').onclick=()=>$('#backupFile').click();
$('#backupFile').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error('Datei zu groß');
  const restored=validatedData(JSON.parse(await file.text()));
  if(!confirm(`${restored.contacts.length} Einrichtungen aus der Sicherung laden? Dein aktuelles Profil und deine Kontaktliste werden ersetzt. Exportiere vorher bei Bedarf eine Sicherung.`))return;
  localStorage.setItem(key,JSON.stringify(restored));state=restored;loadFailed=false;render();toast('Sicherung wiederhergestellt');
 }catch{toast('Import fehlgeschlagen. Bitte eine gültige Masari-JSON-Sicherung wählen.');}
 finally{e.target.value='';}
};

function seedConversationContacts(){
 const batch=window.MASARI_CONTACT_BATCH;
 if(loadFailed || !batch || (state.appliedBatches||[]).includes(batch.id))return;
 const before=state;
 const normalized=value=>String(value||'').trim().toLowerCase();
 const contacts=[...state.contacts];
 for(const seed of batch.contacts){
  const exists=contacts.some(c=>c.id===seed.id || (seed.email && normalized(c.email)===normalized(seed.email)) || normalized(c.name)===normalized(seed.name));
  if(!exists)contacts.push({...seed});
 }
 state={...state,contacts,appliedBatches:[...(state.appliedBatches||[]),batch.id]};
 try{localStorage.setItem(key,JSON.stringify(state));}catch{state=before;toast('Kontakte konnten nicht gespeichert werden. Bitte Browser-Speicher prüfen.');}
}
