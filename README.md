# Túi Mù Bí Mật

Web game có hai kiểu chơi độc lập:

- **Local:** hai người dùng chung thiết bị, dữ liệu nằm trong `localStorage`.
- **Online:** hai thiết bị, Firebase Anonymous Authentication, Cloud Firestore realtime và callable Cloud Functions.

Online không dùng Supabase, SQL Connect, Cloud SQL hoặc service account trong frontend.

## Cấu trúc Firebase

```text
rooms/{roomCode}
rooms/{roomCode}/players/{firebaseUid}
rooms/{roomCode}/boxes/{firebaseUid_boxNumber}
rooms/{roomCode}/actions/{actionId}
rooms/{roomCode}/requests/{requestId}
roomSecrets/{roomCode_firebaseUid}
```

Client chỉ đọc room, players, boxes và actions của phòng mình. `roomSecrets` chứa nội dung chưa mở và vị trí ô bí mật; Security Rules cấm client đọc/ghi collection này. Mọi thay đổi quan trọng được thực hiện bằng Admin SDK trong Cloud Functions.

## 1. Tạo Firebase Project

1. Mở Firebase Console, chọn **Add project**.
2. Thêm một Web App trong Project settings.
3. Web configuration của project `blinkbox-dc9b7` đã được điền trong `js/firebase-config.js`.
4. `.firebaserc` đã trỏ tới project `blinkbox-dc9b7`.

```js
window.FIREBASE_CONFIG = {
  apiKey: "Firebase Web API key",
  authDomain: "blinkbox-dc9b7.firebaseapp.com",
  projectId: "blinkbox-dc9b7",
  storageBucket: "blinkbox-dc9b7.firebasestorage.app",
  messagingSenderId: "1009005503824",
  appId: "1:1009005503824:web:a3d4f372de7e53e6ec7855",
  functionsRegion: "asia-southeast1",
  appCheckSiteKey: ""
};
```

Firebase Web config không phải khóa quản trị. Tuyệt đối không đưa service-account JSON, Admin private key hoặc khóa mã hóa vào frontend/Git.

## 2. Bật Anonymous Authentication

Trong Firebase Console:

1. **Authentication → Get started**.
2. **Sign-in method → Anonymous**.
3. Bật provider và lưu.

Mỗi trình duyệt nhận một Firebase `uid`. Persistence kiểu local giúp refresh vẫn dùng đúng người chơi cũ.

## 3. Tạo Cloud Firestore

1. **Firestore Database → Create database**.
2. Chọn Production mode và region gần người chơi.
3. Không tạo collection thủ công; Functions sẽ tạo khi có phòng đầu tiên.

## 4. Cài Firebase CLI và dependencies

Yêu cầu Node.js 20:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
cd functions
npm install
cd ..
```

Workspace này đã có bộ công cụ cục bộ, không cần cài toàn hệ thống:

- Node.js `20.20.2`: `.tools/node-v20.20.2-darwin-arm64/`
- Firebase CLI `15.24.0`: chạy bằng `./firebase-local.sh`
- npm `10.8.2`: chạy bằng `./npm-local.sh`
- Dependencies Functions đã được cài và khóa trong `functions/package-lock.json`.

Đăng nhập và kiểm tra project:

```bash
./firebase-local.sh login
./firebase-local.sh projects:list
```

## 5. Deploy Rules, indexes và Functions

```bash
./firebase-local.sh deploy --only firestore:rules,firestore:indexes
./firebase-local.sh deploy --only functions
```

Nếu Network báo CORS/404 tại `createRoom`, function chưa được deploy đúng region. Deploy riêng để kiểm tra:

```bash
./firebase-local.sh deploy --only functions:createRoom
```

Frontend gọi bằng Firebase `httpsCallable()` và region `asia-southeast1`, không gọi URL Function bằng `fetch()`. Sau khi deploy frontend/Service Worker mới, vào DevTools → Application → Service Workers → **Unregister**, chọn **Clear site data**, rồi hard reload để loại cache phiên bản cũ.

Functions sử dụng region `asia-southeast1`. Nếu đổi region, sửa đồng thời `functions/src/room-utils.js` và `js/firebase-config.js`.

## 6. Chạy local bằng Emulator

Đặt trước khi tải các script Firebase:

```html
<script>window.FIREBASE_USE_EMULATORS = true;</script>
```

Sau đó:

```bash
firebase emulators:start
```

Mở `http://127.0.0.1:5000`. Nếu chỉ kiểm tra chế độ local, có thể tiếp tục dùng VS Code Live Server hoặc `python3 -m http.server 5500` mà không cần Firebase.

## 7. Kiểm thử bằng hai trình duyệt

1. Mở một cửa sổ thường và một cửa sổ ẩn danh.
2. A chọn **Tạo phòng online**, tạo phòng và gửi mã 6 ký tự.
3. B chọn **Tham gia phòng**, nhập mã và tên.
4. Xác nhận A thấy B ngay mà không refresh; người thứ ba bị từ chối.
5. Hai người sẵn sàng, host bắt đầu chuẩn bị và mỗi người khóa nội dung riêng.
6. Mở DevTools: client không được đọc `roomSecrets`, nội dung/ô bí mật của đối phương.
7. Host bắt đầu; kiểm tra sai lượt, mở ô mình, mở lại và double-click đều bị server chặn.
8. Với chế độ bí mật, mở sai phải chuyển lượt; mở đúng kết thúc ngay trên cả hai máy.
9. Refresh từng trình duyệt để kiểm tra reconnect, đúng lượt và không tạo player trùng.
10. Tắt mạng khi mở ô: UI không được mở trước; bật lại mạng và thử lại.
11. Chạy lại toàn bộ luồng local để xác nhận `localStorage` không bị ảnh hưởng.

## 8. Deploy web app

```bash
firebase deploy --only hosting
```

`firebase.json` deploy thư mục gốc, bỏ qua Functions và file ẩn. Hash routing như `#/join?room=K7P4QX` hoạt động trực tiếp trên Hosting.

## 9. Firebase App Check

- Development/local: để `appCheckSiteKey` rỗng; Functions đang `enforceAppCheck: false`.
- Production: đăng ký reCAPTCHA v3/App Check, điền public site key, kiểm thử metrics trước.
- Sau khi request hợp lệ ổn định, đổi `enforceAppCheck` thành `true` cho callable Functions rồi deploy lại.
- Không hard-code debug token hoặc token App Check.

## Bảo mật và tính nhất quán

- Firestore Rules chỉ cho thành viên đang hoạt động đọc dữ liệu công khai; client không được ghi document nào.
- Mã phòng được sinh trong Cloud Function bằng bộ ký tự không gây nhầm lẫn.
- `openRoomBox` dùng Firestore transaction và `requestId`; server quyết định lượt, kết quả và người thắng.
- Không optimistic update khi mở túi.
- Actions công khai không chứa nội dung bí mật.
- Heartbeat chạy mỗi 25 giây và khi tab trở lại foreground; đây là presence gần đúng của Firestore.

## Giới hạn kiểm thử hiện tại

Mã nguồn đã có đầy đủ cấu hình và backend, nhưng phải điền Firebase Web config, bật Anonymous Auth, tạo Firestore và deploy Functions trước khi kiểm thử end-to-end hai thiết bị. Workspace hiện không có Node.js/Firebase CLI nên dependency Functions chưa được cài và emulator chưa được chạy tại đây.
