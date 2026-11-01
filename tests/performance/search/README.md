# NFR 2.1: Search queries return results within 2 seconds

`search.k6.js` sends read-only search requests through Kong:

```text
GET /api/v1/catalog/items?search=<keyword>
```

สคริปต์นี้ทดสอบ API ไม่ใช่เวลาแสดงผลใน browser: frontend ปัจจุบันโหลด catalog
แล้วกรองคำค้นฝั่ง client จึงต้องทดสอบ UX บนเว็บแยกต่างหาก

### ก่อนเริ่ม

1. ใช้สภาพแวดล้อมทดสอบที่ได้รับอนุญาต และตรวจว่า Pods พร้อม
2. มีข้อมูลสินค้าสำหรับ `MacBook`, `iPad`, `Sony` และตรวจผลค้นหาด้วยตนเองก่อน
   คำ `zzznomatch987654` ใช้ทดสอบกรณีไม่พบสินค้า
3. ล็อกอินที่ `http://localhost:30080` แล้วคัดลอก JWT จาก Local Storage
   key `cu-marketplace.token` อย่าบันทึก Token ลงไฟล์หรือ Git
4. หยุด load test อื่นและหลีกเลี่ยงเปิดเว็บหลายหน้าระหว่างเก็บ baseline

Kong config ปกติใน repo กำหนด rate limit 300 requests/นาที ต้องตรวจค่าที่ deploy จริง
และ request จากหน้าเว็บด้วย ไม่เช่นนั้นอาจเจอ HTTP 429 แม้รันโหลดต่ำ
ห้ามนับ 429 เป็นผลสำเร็จหรือใช้สรุปว่า Search ช้าเพราะ resource ไม่พอ
สคริปต์ k6 ไม่ได้ปรับ Kong, resource หรือ replica ให้อัตโนมัติ

### เตรียม Token

เปิด Bash ที่ root ของ repository แล้วรัน:

```bash
read -rsp "วาง Token แล้วกด Enter: " TOKEN
export TOKEN
printf '\nToken length: %s\n' "${#TOKEN}"
```

วางเฉพาะ JWT ไม่รวม `Bearer` ใช้ Terminal เดิมสำหรับคำสั่งถัดไป
ความยาวมากกว่า 0 ยืนยันเพียงว่ามีค่า ไม่ได้ยืนยันว่า Token ยังใช้ได้

### Smoke test: 1 request/วินาที เป็นเวลา 60 วินาที

ถ้ามี k6 ติดตั้งอยู่:

```bash
k6 run tests/performance/search/search.k6.js
```

ถ้าใช้ Docker บน Linux:

```bash
docker run --rm -i --network host \
  -e TOKEN -e RATE=1 -e DURATION=60s \
  grafana/k6 run - < tests/performance/search/search.k6.js
```

การรัน Docker ครั้งแรกอาจต้องดาวน์โหลด image หากต้องการเปรียบเทียบหลายรอบ
ให้ใช้ k6 version/image เดียวกันและบันทึก version ไว้ในรายงาน

### เพิ่มเป็น 3 requests/วินาที

หลังรอบแรกผ่านและ rate limit reset แล้ว:

```bash
docker run --rm -i --network host \
  -e TOKEN -e RATE=3 -e DURATION=60s \
  grafana/k6 run - < tests/performance/search/search.k6.js
```

หากใช้ native k6 เปลี่ยนโหลดได้ด้วย:

```bash
RATE=3 DURATION=60s k6 run tests/performance/search/search.k6.js
```

ค่า default ของ `BASE_URL` คือ `http://localhost:30080` ถ้าเปลี่ยน target
ให้ export `BASE_URL` และสำหรับ Docker เพิ่ม `-e BASE_URL` ด้วย
ต้องใช้ Token ที่ target นั้นยอมรับ

### เตรียม Kong สำหรับ Load test 25–200 RPS

ใช้เฉพาะสภาพแวดล้อมทดสอบ การเพิ่ม quota ไม่ได้เพิ่ม CPU/RAM หรือยืนยันว่า
backend รองรับโหลดได้ และไม่ได้ปิด JWT authentication

ตรวจ context และ config ก่อน (ตัวอย่างใช้ kubeconfig ของ k3s ในเครื่องนี้):

```bash
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" config current-context
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" -n cu-marketplace \
  get kongplugin rate-limit -o jsonpath='{.config}{"\n"}'
```

บันทึกค่าเดิมไว้ก่อน การคืนค่าด้านล่างสมมติว่าค่าเดิมคือ `minute: 300`
ถ้าค่าเดิมไม่ใช่ 300 ให้คืนค่าตามที่บันทึกแทน

เพิ่มเพดานเป็น 60,000 requests/นาที ด้วย merge patch ที่เปลี่ยนเฉพาะ `minute`:

```bash
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" -n cu-marketplace \
  patch kongplugin rate-limit --type=merge \
  --patch-file=deploy/kong/performance-rate-limit.patch.yaml
```

200 RPS เท่ากับ 12,000 requests/นาที เพดานนี้เผื่อ request อื่นและการทดสอบ
ไม่ใช่การเพิ่มโหลดจริงเป็น 1,000 RPS ไม่เปลี่ยน identity/policy ของ quota เดิม
plugin นี้ผูกกับ ingress ที่มีอยู่ จึงเพิ่ม quota ให้ traffic ที่ใช้ plugin นั้นด้วย
ไม่ใช่เฉพาะ Search และ policy `local` นับแยกในแต่ละ Kong replica
ผู้ใช้หลายคนที่ใช้ KongConsumer เดียวกันอาจแชร์ quota จึงควรงด test อื่นพร้อมกัน

รอ controller นำ config ไปใช้และตรวจยืนยันด้วย request ที่ยืนยันตัวตนแล้ว:

```bash
curl --silent --show-error --get \
  'http://localhost:30080/api/v1/catalog/items' \
  --data-urlencode 'search=MacBook' \
  -H "Authorization: Bearer $TOKEN" \
  -D - -o /dev/null
```

ต้องเป็น HTTP 200 และ header `X-RateLimit-Limit-Minute` เป็น 60000
ถ้ายังเป็น 300 อย่าเพิ่งเริ่มโหลดสูง ให้รอและตรวจ Kong Controller
อย่าเปิด `curl -v` เพราะจะแสดง Authorization header
ไม่ต้อง rebuild image หรือ restart Deployment สำหรับ patch นี้
`deploy/apply.sh` จะนำค่าปกติ 300/minute กลับมา จึงอย่ารันระหว่างวัดผล
และอย่า apply ไฟล์ patch ด้วย `kubectl apply -f` เพราะไม่ใช่ manifest เต็ม

### Load test: 25 → 50 → 100 → 200 RPS

ตั้ง 200 search requests/วินาที เป็นสมมติฐานโหลดปกติสูงสุด ไม่ใช่ผู้ใช้พร้อมกัน
200 คน เก็บ resource/replica/dataset เดิมไว้ตลอดชุดทดสอบ และรันทีละรอบ
ไม่ใช้ loop อัตโนมัติข้ามไปโหลดถัดไปเมื่อรอบก่อนยังไม่ผ่าน

| RATE (RPS) | ระยะเวลา | Requests โดยประมาณ | VUs ที่เตรียมไว้ |
| --- | --- | --- | --- |
| 25 | 5 นาที | 7,500 | 63 |
| 50 | 5 นาที | 15,000 | 125 |
| 100 | 5 นาที | 30,000 | 250 |
| 200 | 5 นาที | 60,000 | 500 |

รอบแรกเริ่มที่ 25 RPS:

```bash
docker run --rm -i --network host \
  -e TOKEN -e RATE=25 -e DURATION=5m \
  grafana/k6 run - < tests/performance/search/search.k6.js
```

เมื่อทุก threshold ผ่าน ตรวจ resource และ error แล้วพักอย่างน้อย 1 นาที
หรือจนระบบฟื้นสู่ baseline จากนั้นใช้คำสั่งเดิม เปลี่ยน `RATE=50`, `RATE=100`,
`RATE=200` ทีละรอบ รักษา image/version เดียวกันทุกครั้ง ถ้าไม่ผ่านให้หยุดเพิ่มโหลด
ถ้าผ่าน 200 RPS ค่อยยืนยันซ้ำที่ `RATE=200 DURATION=15m`
ยังไม่มี warm-up แยกในสคริปต์นี้ ทุก request ของแต่ละรอบรวมอยู่ในเกณฑ์เวลา

ค่า VUs อัตโนมัติคือ `max(10, ceil(RATE × 2 วินาที × 1.25))`
โดยตั้ง `maxVUs` เท่ากับจำนวนที่เตรียมไว้ เพื่อลดผลจากการสร้าง VU ระหว่างวัด
สามารถกำหนด `PRE_ALLOCATED_VUS` และ `MAX_VUS` ได้ถ้าต้องการเปลี่ยน budget
สำหรับ Docker ต้องส่งด้วย `-e PRE_ALLOCATED_VUS=... -e MAX_VUS=...`

500 VUs เป็น budget เผื่อเมื่อ latency เข้าใกล้ 2 วินาที ไม่ได้แปลว่ามี 500
requests ทำงานพร้อมกันตลอด หากช้าไปถึง timeout 5 วินาทีอาจยังเกิด
`dropped_iterations` ได้ ซึ่งต้องนับว่าไม่ผ่าน ห้ามตัดออกจากรายงาน
ตรวจ CPU/RAM ของ load generator ด้วย โดยเฉพาะเมื่อ Docker k6 กับ k3s อยู่เครื่องเดียวกัน
หาก generator เต็ม ให้แยกเครื่องยิงโหลดหรือปรับ budget แล้วรายงานเงื่อนไขใหม่

### ดู resource และคืนค่า Kong หลังทดสอบ

เปิดอีก Terminal เพื่อตรวจ Pods และ CPU/RAM (ต้องมี metrics-server):

```bash
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" -n cu-marketplace top pods
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" -n cu-marketplace get pods
```

เก็บค่าก่อน/ระหว่าง/หลังแต่ละรอบ รวมถึง CPU ของเครื่องยิงโหลดและ Pod restarts
หยุดด้วย Ctrl+C ถ้าเครื่องเริ่มไม่ตอบสนอง, มี OOM/restart หรือ error ต่อเนื่อง

เมื่อเสร็จ หรือยกเลิกการทดสอบ คืนค่าปกติเดิม 300/minute:

```bash
kubectl --kubeconfig="$HOME/.kube/k3s.yaml" -n cu-marketplace \
  patch kongplugin rate-limit --type=merge -p '{"config":{"minute":300}}'
```

ตรวจ config และ response header อีกครั้งว่า controller นำค่าเดิมกลับไปใช้แล้ว

### เกณฑ์ผ่านและการอ่านผล

- `search_elapsed_ms`: `max<=2000` วัดครอบการเรียก HTTP รวมการเชื่อมต่อ
  แต่ไม่รวมการ parse JSON, การตรวจผล หรือ browser rendering
- `http_req_failed`: 0% รวมถึง 401, 429, 5xx และ timeout ต้องไม่เกิด
- `checks`: ผ่านทั้งหมด ได้แก่ HTTP 200, JSON array และสินค้าที่คืนมามีสถานะ Available
- `dropped_iterations`: 0 เพื่อยืนยันว่าไม่ได้ข้าม iteration ของโหลดเป้าหมาย

การตรวจ array/status ไม่ใช่การยืนยันความถูกต้องของ fuzzy search ทั้งหมด
array ว่างอาจเป็นผลที่ถูกต้อง จึงต้องยืนยัน expected results ของข้อมูลทดสอบก่อน
สคริปต์ไม่กรอง request ที่ช้าหรือผิดพลาดออกจาก timing และเก็บ p95/p99/max
NFR นี้ไม่ได้อนุญาตให้ 5% ของ request เกิน 2 วินาที จึงไม่ใช้ p95 อย่างเดียวตัดสิน

บันทึกจำนวนสินค้า, อัตรา request, ระยะเวลา, k6 version, resource/replica,
latency, error และ dropped iterations ของแต่ละรอบ พร้อม CPU/RAM/Pod restarts
ผลผ่านจำกัดเฉพาะ environment, dataset และโหลดที่ทดสอบ ไม่ใช่การรับรองทุกโหลด

หากเจอ 401 ให้ตรวจ Token หมดอายุ หากเจอ 429 ให้หยุดและตรวจ rate limit
ห้ามใช้ `--http-debug` หรือแชร์ log/header ที่มี Authorization
หลังใช้งานเสร็จล้างค่าจาก Terminal:

```bash
unset TOKEN
```
