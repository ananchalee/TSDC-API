// ทดสอบ /insert_video_hd ว่าคืน ids กลับมาถูกต้องไหม — รันบนเครื่อง API (ที่ต่อ DB ได้)
//   node test-insert-video-hd.js [http://localhost:PORT]
// สร้างแถวทดสอบจริงในตาราง แล้วบอก id ที่ต้องไปลบทิ้งเองตอนท้าย
const http = require('http');
const base = process.argv[2] || 'http://10.26.1.21:1661/api';
const stamp = String(Date.now()).slice(-4);   // สั้นๆ พอกันชนกัน ให้ชื่อยาวใกล้เคียงของจริง
// เคสปกติ: เลขออเดอร์แบบ ICCZxxxxx
const name = `P52-ICCZ${stamp}-Date(2026-08-15)-Time(15-52-48).mp4`;
// เคสยาวสุดที่เจอในระบบจริง: เลขออเดอร์ 16 หลัก + ต่อท้าย -001
const longName = `P52-111186900240${stamp}-Date(2026-08-15)-Time(15-52-48)-001.mp4`;

function call(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(base.replace(/[/]+$/, "") + "/insert_video_hd");
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let out = '';
      res.on('data', (c) => out += c);
      res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(out)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const row = (n, nameOld) => ({
  VIDEO_LIST: [{
    FTVideo_name: n, FTVideo_name_old: nameOld || '',
    FTPath: 'D:/VideoRecord/' + n, FCFile_size: 1.23,
    FNStaUpload: 0, FTStaDesc: 'Insert success',
    FDStartdate: '2026-08-15 15:52:48', FDEnddate: '2026-08-15 15:53:48'
  }],
  FTTable_id: 'P52', FTOrder_number: 'ICCZ00000',
  FTUser_create: 'test-script', FTIp_address_local: '127.0.0.1'
});

(async () => {
  console.log('1) INSERT แถวใหม่');
  let r = await call(row(name));
  console.log('   ', JSON.stringify(r));
  if (!r.ids || !r.ids.length) { console.log('   *** ไม่มี ids กลับมา — แก้ไม่ติด ***'); process.exit(1); }
  const id = r.ids[0].FNVideo_id;
  console.log('   FNVideo_id =', id, r.inserted === 1 ? '(inserted OK)' : '(คาดว่า inserted=1)');

  const renamed = id + '-' + name;
  console.log('2) UPDATE เปลี่ยนชื่อเป็น', renamed);
  r = await call(row(renamed, name));
  console.log('   ', JSON.stringify(r));
  if (!r.ids || !r.ids.length) { console.log('   *** รอบ update ไม่คืน ids ***'); process.exit(1); }
  console.log('   FNVideo_id =', r.ids[0].FNVideo_id, r.updated === 1 ? '(updated OK)' : '(คาดว่า updated=1)');
  console.log(r.ids[0].FNVideo_id === id ? '   id ตรงกับรอบแรก - ถูกต้อง' : '   *** id ไม่ตรงกับรอบแรก ***');

  console.log('');
  console.log('3) เคสชื่อยาวสุดที่เป็นไปได้จริง (' + longName.length + ' ตัวอักษร)');
  r = await call(row(longName));
  console.log('   ', JSON.stringify(r));
  let id2 = null;
  if (r.status !== 'success') {
    console.log('   *** ชื่อยาวขนาดนี้ยังลงไม่ได้ ต้องขยายคอลัมน์ FTVideo_name ***');
  } else {
    id2 = r.ids[0].FNVideo_id;
    const renamed2 = id2 + '-' + longName;
    console.log('   ต่อ id เข้าไปเป็น ' + renamed2.length + ' ตัวอักษร:', renamed2);
    r = await call(row(renamed2, longName));
    console.log('   ', JSON.stringify(r));
    console.log(r.status === 'success' ? '   ผ่าน - ชื่อยาวสุดยังลงได้' : '   *** ชน varchar(70) ต้องขยายคอลัมน์ ***');
  }

  console.log('');
  console.log('ลบแถวทดสอบทิ้งด้วย:');
  console.log(`   DELETE FROM TSDC_VIDEO_HD WHERE FNVideo_id IN (${id}${id2 ? ', ' + id2 : ''});`);
})().catch(e => { console.error('เรียก API ไม่สำเร็จ:', e.message); process.exit(1); });
