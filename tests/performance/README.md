# Performance tests

แยกไฟล์ตาม NFR ที่ทดสอบ ทุกคำสั่งในคู่มือให้รันจาก **root ของ repository**
ไม่ใช่จากโฟลเดอร์ย่อย

| Folder | Requirement | คู่มือ |
| --- | --- | --- |
| `search/` | NFR 2.1 — ค้นหาภายใน 2 วินาที | [Search](./search/README.md) |
| `item-status/` | NFR 2.2 — สถานะสินค้าเปลี่ยนภายใน 2 วินาทีหลัง action | [Item status](./item-status/README.md) |
| `chat/` | NFR 2.3 — ส่งข้อความถึงฝั่งผู้รับภายใน 1 วินาที | [Chat](./chat/README.md) |

```text
tests/performance/
├── README.md
├── search/
│   ├── README.md
│   └── search.k6.js
├── item-status/
│   ├── README.md
│   ├── item-status.k6.js
│   ├── status-observer.mjs
│   └── item-status.test.mjs
└── chat/
    ├── README.md
    ├── chat.k6.js
    ├── protocol.mjs
    ├── pacing.mjs
    └── chat.test.mjs
```

## ไฟล์แต่ละชนิดใช้ทำอะไร

- `*.k6.js`: สคริปต์ที่รันด้วย **k6** เพื่อส่ง request และวัดผลจริง
- `status-observer.mjs`: เครื่องมือที่รันด้วย **Node.js** เพื่ออ่านสถานะสินค้าทดสอบ
  จาก Catalog แบบ read-only เปิดเฉพาะ localhost ใช้ช่วยวัด NFR 2.2
- `item-status.test.mjs`: unit tests ที่รันด้วย **Node.js** เพื่อตรวจ logic ของสคริปต์
  และ observer ด้วยข้อมูลจำลอง ไม่ใช่ load test และไม่สร้างข้อมูลธุรกิจจริง
- `README.md`: วิธีเตรียม ทดสอบ และอ่านผลของแต่ละ NFR

`.mjs` คือ JavaScript ที่ระบุชัดให้ Node.js ใช้ระบบ ES Modules (`import` / `export`)
ไม่ใช่ภาษาใหม่ และไม่ใช่ Backend service ที่ต้อง deploy เพิ่ม
ในชุดนี้ `.mjs` เป็นเครื่องมือช่วยทดสอบ ส่วน k6 ใช้ runtime ของตัวเองกับ `*.k6.js`

การจัดโฟลเดอร์ไม่ได้เปลี่ยน threshold, โหลด หรือ business flow
config สำหรับปรับเพดาน Kong ยังคงอยู่ที่ `deploy/kong/performance-rate-limit.patch.yaml`
และไม่ถูก apply อัตโนมัติเมื่อรันสคริปต์
