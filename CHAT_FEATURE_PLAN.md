# Kế hoạch phát triển chat cho Task Manager

Ngày lập: 21/10/2026. Phạm vi người dùng xác nhận: chat giữa thành viên và chat theo task.

Cập nhật v2: tách rõ hai luồng sản phẩm, đầu việc backend/frontend và bổ sung giao diện mẫu tại [`design/chat/index.html`](design/chat/index.html). Các ảnh ở mục 11 được chụp từ bản mẫu HTML, dùng dữ liệu minh họa.

Bổ sung v3: chat nổi ở góc dưới bên phải để nhắn tin khi vẫn đang xem công việc. Đây là một cách hiển thị của chat 1–1/chat task, dùng chung dữ liệu và quyền với trang Chat.

Điều chỉnh giao diện theo phản hồi: dùng trực tiếp `DashboardLayout`, `NavBar`, `SideMenu`, `PageContainer`, `TaskDetailsPage` và CSS từ frontend hiện tại để dựng mẫu. Giữ sidebar hồ sơ 256px, navbar ngôn ngữ/theme/thông báo, menu theo role và các thẻ Task Status/Timeline & People. Chỉ bổ sung phần chat; không thay khung ứng dụng bằng một thiết kế mới.

Đây là kế hoạch triển khai, chưa phải tính năng đã được xây dựng. Các quy tắc sản phẩm dưới đây là đề xuất mặc định để có thể bắt đầu thiết kế và chia công việc.

## 1. Kết quả đọc dự án

| Hiện trạng trong mã nguồn | Ý nghĩa đối với tính năng chat |
| --- | --- |
| `backend/server.js`: Express, mount REST routes; export app để test; chỉ listen ngoài test/Vercel | Cần tách khởi tạo app và HTTP/Socket.IO server, giữ khả năng test API độc lập |
| `backend/models/User.js`, `middlewares/authMiddleware.js`: MongoDB, JWT, role admin/user | Tái sử dụng danh tính và quy tắc xác thực; bổ sung middleware cho socket |
| `backend/models/Task.js`: `createdBy`, `assignedTo[]` | Đã có dữ liệu để xác định người tham gia phòng task |
| `backend/controllers/taskController.js:getTaskById` | Admin, người tạo và người được giao được xem task; đề xuất dùng cùng quyền cho chat task |
| `backend/controllers/userController.js:deleteUser` | Xóa cứng user và xóa hàng loạt task do user tạo; cần xử lý vòng đời chat cả ở đường đi này |
| `backend/utils/teamMembersSummary.js` | Team Members chỉ gồm người có task chung; chưa phải danh bạ toàn hệ thống |
| `backend/models/Notification.js`, `components/layouts/NotificationDropdown.jsx` | Có thông báo, hiện frontend tải lại mỗi 3 giây; chưa có realtime |
| `backend/routes/uploadRoutes.js`, `middlewares/uploadMiddleware.js` | Có upload ảnh JPG/PNG tối đa 5 MB lên Cloudinary; chưa có upload tài liệu hoặc cơ chế ảnh riêng tư cho chat |
| `frontend/Task-Manager/src/App.jsx`, `context/userContext.jsx` | Route tách admin/user; user/token có sẵn; provider chat nên tồn tại qua chuyển trang |
| `components/team/TeamMembersView.jsx`, `components/tasks/TaskDetailsPage.jsx` | Có vị trí phù hợp cho nút nhắn tin và khung thảo luận task |
| `backend/vercel.json`, `frontend/Task-Manager/vercel.json` | Có cấu hình Vercel trong repo; chưa xác minh môi trường đang chạy thực tế |
| `tests/backend-tests`, `frontend/Task-Manager/src/tests` | Có Vitest, Supertest, MongoDB Memory Server và React Testing Library để mở rộng |

Chưa có model hội thoại/tin nhắn hay dependency Socket.IO. Bộ test đã được tổ chức lại và merge: 87 test backend, 106 test frontend pass; frontend build pass. Lint toàn ứng dụng còn 11 lỗi và 7 cảnh báo trong mã có sẵn; lint phần test và cấu hình đã sửa pass. Đây là baseline trước khi phát triển chat.

## 2. Phạm vi sản phẩm

### Ý tưởng A — Chat cá nhân 1–1

Mục đích: hỏi nhanh, hỗ trợ riêng và phối hợp giữa hai thành viên. Người dùng bấm “Nhắn tin” trên thẻ thành viên hoặc chọn “Cuộc trò chuyện mới” trong trang Chat. Server tạo hoặc mở lại đúng hội thoại của cặp user.

**Backend:**

- Thêm API danh bạ chat phân trang cho user thường và admin; không dùng `GET /api/users` vì endpoint đó chỉ dành cho admin.
- Tạo `directKey` từ hai ID ở server, kiểm tra user đích còn tồn tại, chặn tự chat và chống tạo trùng khi hai bên cùng mở.
- Hai người là thành viên cố định; quyền đọc/gửi không phụ thuộc việc còn task chung hay không.
- Mọi API, sự kiện realtime và trạng thái đọc chỉ phục vụ hai người đó. Admin không có quyền đọc DM của người khác.
- Khi xóa một tài khoản: ngắt socket, giữ lịch sử cho người còn lại dưới dạng chỉ đọc và hiển thị nhãn tài khoản đã xóa.

**Frontend:**

- Danh sách hội thoại có ảnh/tên, tin gần nhất, thời gian và badge chưa đọc; bộ lọc “Cá nhân”.
- Header thể hiện tên người nhận và “Chat cá nhân · Chỉ hai người tham gia”; không hiển thị online nếu chưa xây dựng presence.
- Bảng thông tin bên phải giải thích quyền truy cập; bản mobile dùng hai màn hình danh sách/hội thoại có nút quay lại.
- Composer hỗ trợ Enter để gửi, Shift+Enter để xuống dòng, 4.000 ký tự, pending/failed/retry và giữ bản nháp theo hội thoại.
- Khi tài khoản đối tác bị xóa, thay composer bằng trạng thái chỉ đọc; không gán trạng thái “đã xem” chỉ dựa trên gửi thành công.

**Nghiệm thu:** A mở chat B, B thấy đúng hội thoại đó; C và admin ngoài cặp đều bị chặn. Đăng nhập lại vẫn đọc được lịch sử, retry không tạo tin trùng.

### Ý tưởng B — Chat nhóm theo task công việc chung

Mục đích: lưu trao đổi, quyết định và tiến độ ngay trong ngữ cảnh công việc. Mỗi task có một phòng duy nhất, không phải một nhóm được tạo thủ công rồi đặt tên giống task.

**Backend:**

- Tạo hoặc lấy hội thoại theo `taskId`, có unique index; khởi tạo khi task được mở thảo luận lần đầu.
- Danh sách tham gia lấy từ người tạo và `assignedTo[]`, loại trùng. Admin có thể mở theo quyền xem task hiện tại, nhưng không tự theo dõi tất cả phòng.
- Thành viên hợp lệ được ghi nhận khi phòng khởi tạo và khi task thay đổi; người được giao phải nhận được hội thoại trong danh sách dù chưa từng bấm mở phòng. Admin chỉ được theo dõi khi chủ động mở.
- Response lấy tên, trạng thái, hạn và người tham gia từ task hiện tại; không sao chép thành một task thứ hai trong Conversation.
- Tích hợp việc đổi `assignedTo`, thay role, xóa task và xóa user. Xử lý cả đường `deleteUser -> Task.deleteMany`, phát sự kiện thu hồi tới mọi thiết bị/instance.
- Dùng cùng access service cho lịch sử/gửi/đọc/subscribe và phát nội dung. Kiểm thử race giữa gửi tin và thay đổi quyền; việc bị đưa khỏi socket room không phải biện pháp kiểm soát quyền duy nhất.

**Frontend:**

- Bộ lọc “Công việc”; mỗi dòng dùng biểu tượng task, tên task và tin gần nhất.
- Header có tên task, số người tham gia; thanh ngữ cảnh có trạng thái, hạn và nút “Xem công việc”.
- Bảng bên phải có tiến độ, ưu tiên, người tạo và người được giao; nêu rõ quản trị viên có quyền xem chat task.
- Trong `TaskDetailsPage`, thêm thẻ “Thảo luận công việc” sau Checklist trong cột nội dung hiện có. Giữ nguyên thứ tự Task Information → Checklist, cùng Task Status và Timeline & People; mobile theo bố cục xếp dọc của trang hiện tại. Có nút mở hội thoại toàn màn hình.
- Hai nơi dùng cùng `conversationId`, API, bộ nhớ đệm và watermark đọc. Tin gửi từ chi tiết task xuất hiện ngay khi mở phòng đó trong trang Chat.
- Khi bị thu hồi quyền: dừng nhận nội dung, xóa cache hội thoại và đưa về màn hình phù hợp. Task hoàn thành vẫn cho phép trao đổi.

**Nghiệm thu:** người tạo và người được giao trao đổi trong cùng phòng ở cả hai vị trí giao diện. Thêm người cho phép xem lịch sử; bỏ người chặn cả đọc/gửi/realtime trên kết nối đã mở.

### Nền tảng dùng chung cho hai ý tưởng

| Dùng chung | Riêng cho 1–1 | Riêng cho task |
| --- | --- | --- |
| Message, lịch sử, phân trang, gửi lại, unread, realtime, composer | Cặp user cố định, directKey, thông tin người nhận | taskId, quyền động, danh sách tham gia, ngữ cảnh task |
| ChatProvider và ConversationPanel | NewChatDialog và nút nhắn tin từ Team Members | TaskDiscussionPanel và nút mở lại task |

Sự khác biệt được xác định bằng `Conversation.type`, không xây hai hệ thống nhắn tin riêng.

### Cách hiển thị bổ sung — Chat nổi như cửa sổ nhắn tin trên Facebook web

Đề xuất áp dụng để người dùng không phải rời task/dashboard khi cần trao đổi nhanh. Trang Chat vẫn là nơi đọc lịch sử dài, tìm hội thoại và xem đầy đủ ngữ cảnh; khung nổi phục vụ trao đổi ngắn trong lúc làm việc.

**Trải nghiệm:**

- Nút “Chat nhanh” ở góc dưới bên phải của các màn hình sau đăng nhập, có badge tổng chưa đọc. Bấm nút mở danh sách hội thoại cá nhân và công việc.
- Chọn người/task mở cửa sổ khoảng 330 × 450 px; header có tên, loại hội thoại, thu nhỏ, đóng và mở sang trang Chat.
- Desktop rộng: tối đa hai cửa sổ. Màn hình trung bình: một cửa sổ. Nếu mở vượt giới hạn, đưa cửa sổ cũ về danh sách, giữ lịch sử và bản nháp.
- Thu nhỏ thành thanh tên phía dưới, bấm lại để khôi phục. Đóng chỉ đóng giao diện, không xóa hội thoại hoặc lịch sử.
- Chuyển trang vẫn giữ khung nổi. Nếu mở chính hội thoại đó trên trang Chat hoặc khung thảo luận task đang hiển thị, chuyển focus sang khung chính để tránh hai composer cho một hội thoại.
- Mobile: nút chat mở danh sách gọn; chọn một hội thoại chuyển sang màn hình chat đầy đủ, không đặt nhiều cửa sổ nhỏ trên bàn phím.
- Khi đang nhập tiếng Việt, Enter chỉ gửi nếu không còn trong phiên nhập IME; Shift+Enter xuống dòng. Tin đến không được tự giành focus của form đang làm việc.

**Backend:** tái sử dụng toàn bộ API, JWT, Socket.IO, Message và Conversation. Không thêm loại conversation/model/socket riêng cho popup. Đọc/gửi và kiểm tra quyền vẫn đi qua cùng service. `conversation:access-revoked` phải đóng và xóa cache cả khung nổi, kể cả cửa sổ đang thu nhỏ.

**Frontend:**

- Thêm `FloatingChatDock`, `MiniChatWindow`, `ChatLauncher` và `QuickConversationPicker` trong vùng đã xác thực, bên trong cùng `ChatProvider`; không mount lại chúng trong từng trang hoặc `DashboardLayout`.
- Provider giữ `openWindows: [{ conversationId, minimized }]`, drafts và focus; dùng chung cache tin nhắn/watermark với trang Chat và chi tiết task.
- Chỉ một kết nối socket và một đường gửi REST. Merge tin theo message ID/clientMessageId; một event không được tạo hai bản tin hoặc hai thông báo vì đang mở nhiều giao diện.
- Chỉ đánh dấu đọc khi cửa sổ được mở, tab đang hiển thị và tin thực tế đã nằm trong vùng nhìn; cửa sổ thu nhỏ không tự đánh dấu đọc.
- Xử lý thứ tự lớp hiển thị: dialog xác nhận của ứng dụng nằm trên chat nổi; bố trí nút gọn để người dùng có thể thu khung khi cần thao tác với nội dung phía dưới. Giữ tiêu điểm bàn phím khi thu nhỏ/khôi phục/đóng.
- Đóng và xóa state khi logout hoặc đổi tài khoản. Nếu giữ trạng thái khung qua refresh thì chỉ lưu ID và trạng thái thu nhỏ theo tài khoản; mở lại phải xác minh quyền qua API. Bản nháp/tin nhắn chưa gửi mặc định chỉ ở bộ nhớ.

**Nghiệm thu:** gửi trong khung nổi rồi mở toàn màn hình thấy đúng một tin; bản nháp được giữ; đổi route không tạo thêm socket; thu nhỏ không tăng số đã đọc; đóng không xóa lịch sử; thu hồi quyền chặn cả popup. Đây là phần bổ sung sau khi chat 1–1 và task hoạt động ổn định.

### Bản đầu tiên: chat văn bản hoàn chỉnh

- Chat 1–1 giữa hai tài khoản đang tồn tại; mỗi cặp có đúng một hội thoại.
- Chat nhóm theo task: mỗi task có tối đa một hội thoại, tạo khi mở lần đầu.
- Danh sách hội thoại có tin cuối, thời gian và số tin chưa đọc; lọc Cá nhân / Công việc.
- Gửi và nhận tin thời gian thực; tải lịch sử theo trang, 30 tin/lần, tối đa 100.
- Giao diện trạng thái đang gửi / đã lưu trên server / gửi thất bại, cho phép thử lại.
- Tải lại tin bị lỡ sau mất mạng, refresh hoặc đổi thiết bị; chống hiển thị và lưu trùng.
- Đánh dấu đã đọc, đồng bộ số chưa đọc giữa các tab/thiết bị.
- Responsive, dark mode, trạng thái tải/rỗng/lỗi và điều hướng bằng bàn phím.

### Phần mở rộng sau khi bản đầu ổn định

- Đang nhập, online/offline với thời hạn tự hết; online khi còn ít nhất một kết nối.
- Ảnh đính kèm qua endpoint có kiểm tra quyền hội thoại và cơ chế truy cập ảnh phù hợp.
- Trả lời tin, mention, tìm nội dung, sửa/thu hồi tin, nhóm tự tạo.
- Gọi thoại/video, chatbot AI và push khi đóng ứng dụng là các hạng mục riêng.

## 3. Quy tắc quyền truy cập và vòng đời

| Tình huống | Hành vi đề xuất |
| --- | --- |
| Chat 1–1 | Chỉ hai người tham gia được đọc/gửi; admin không được đọc chỉ nhờ role |
| Bắt đầu chat | Cho phép với tài khoản khác còn tồn tại; Team Members là lối tắt, danh bạ chat là endpoint phân trang riêng |
| Chat task | Người tạo, người đang được giao và admin được mở, xem lịch sử, gửi tin; giao diện hiển thị rõ admin có quyền truy cập |
| Admin mở chat task | Ghi nhận người đã tham gia để quản lý trạng thái đọc; không tự đăng ký tất cả admin vào mọi phòng |
| Task thêm người | Người mới được xem toàn bộ lịch sử task; trạng thái đọc ban đầu là chưa đọc các tin của người khác |
| Task bỏ người | Thu hồi quyền ngay sau cập nhật: không đọc, gửi hay nhận nội dung mới, trừ khi vẫn là người tạo hoặc admin |
| Thay đổi role admin | Tính lại quyền task cho các kết nối liên quan; không chỉ kiểm tra role ở lúc kết nối |
| Task hoàn thành | Vẫn cho trao đổi, không tự khóa phòng |
| Task bị xóa | Phòng task ngừng xuất hiện và từ chối truy cập; giữ dữ liệu đã lưu để tránh mất lịch sử do cascade, chưa tự đặt thời hạn xóa |
| User bị xóa | Ngắt mọi socket của user; giữ tin cũ với nhãn “Tài khoản đã xóa”; hội thoại 1–1 còn lại chỉ đọc |
| Xóa user làm xóa task | Thu hồi quyền/đóng chat của tất cả task bị ảnh hưởng, kể cả task bị xóa bằng `deleteMany` |
| Task đổi tên | Hiển thị tên hiện tại, không tạo phòng mới |

Quyền chat task phải lấy từ Task và User hiện tại. Bản ghi tham gia hội thoại và việc đã join socket room không đủ để chứng minh quyền. Áp dụng cùng một policy ở REST, subscribe, phát nội dung và mọi thao tác ghi. Khi mất quyền, client xóa dữ liệu hội thoại khỏi state/cache.

## 4. Kiến trúc đề xuất

Giữ React + Express + Mongoose. Thêm `socket.io` ở backend và `socket.io-client` ở frontend; chưa cần dịch vụ chat riêng.

```mermaid
flowchart LR
    UI[React: ChatProvider và giao diện] -->|REST: hội thoại, lịch sử, gửi, đọc| API[Express + JWT]
    UI <-->|Socket.IO: sự kiện mới| RT[Realtime gateway + JWT]
    API --> S[Chat service + kiểm tra quyền]
    RT --> S
    S --> DB[(MongoDB)]
    S -->|Sau khi commit| RT
    RT <-. Khi nhiều instance .-> A[Adapter dùng kho chia sẻ]
```

- REST là đường ghi duy nhất ở bản đầu: dễ kiểm thử, kiểm tra quyền và thử lại. Socket dùng để nhận sự kiện; không tạo thêm một luồng gửi tin độc lập.
- MongoDB là nguồn dữ liệu chuẩn. Socket lỗi không làm mất bản tin đã lưu; client đồng bộ lại qua REST.
- `ChatProvider` nằm bên trong `UserProvider`, tồn tại qua các route; không đặt kết nối trong `DashboardLayout` vì layout được dựng lại ở mỗi trang.
- Dùng room `user:<id>` do server gán từ JWT để đồng bộ mọi thiết bị; chỉ phát nội dung đến người còn quyền. Các đăng ký theo hội thoại phải được kiểm tra và thu hồi khi quyền đổi.
- JWT qua `handshake.auth.token`, kiểm tra token và user ở server. Socket bị ngắt khi token hết hạn, logout hoặc user bị xóa; kiểm tra lại quyền khi thao tác.
- Origin của socket và REST phải được giới hạn theo môi trường; giới hạn tốc độ gửi, mở hội thoại và subscribe; giới hạn payload.

Socket.IO mặc định không đảm bảo tự phát lại mọi sự kiện bị lỡ, nên reconnect phải lấy lại dữ liệu đã lưu. Xem [delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/) và [socket middleware](https://socket.io/docs/v4/middlewares/).

### Triển khai với cấu hình Vercel hiện có

Tài liệu Vercel hiện tại hỗ trợ Socket.IO qua WebSocket trực tiếp; kết nối có thể bị đóng khi hết thời lượng Function và các lần kết nối có thể vào instance khác. Vì vậy cần kiểm chứng đường dẫn socket, cấu hình transport, reconnect và adapter chia sẻ trước khi chọn cấu hình production. Xem [Vercel WebSockets](https://vercel.com/docs/functions/websockets).

- Bước đầu: thử trên preview nếu có quyền/môi trường deploy. Dùng `transports: ['websocket']` và path thống nhất; kiểm tra config `builds/routes` hiện tại có cần cập nhật.
- Nếu production dùng nhiều Function/instance: phải có adapter phát sự kiện giữa instance ngay từ đầu; không chờ đến khi lượng người dùng lớn. Bản ghi MongoDB vẫn lưu toàn bộ lịch sử.
- Nếu chọn Node chạy liên tục một instance: có thể bắt đầu không dùng adapter; thêm adapter trước khi nhân bản backend. Đây là phương án thay thế khi spike Vercel không đáp ứng nhu cầu vận hành.
- Redis Pub/Sub adapter không thay thế lưu tin và không hỗ trợ Socket.IO connection state recovery; thiết kế đồng bộ bằng REST vẫn cần thiết. Xem [Redis adapter](https://socket.io/docs/v4/redis-adapter/) và [multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/).
- Không thay hosting, tạo tài nguyên trả phí hoặc deploy production trong phạm vi lập kế hoạch này.

## 5. Thiết kế dữ liệu

Thêm ba collection; không nhúng lịch sử tin nhắn vào Task/User.

| Model | Trường chính | Index/ràng buộc |
| --- | --- | --- |
| `Conversation` | `type: direct/task`, `directKey`, `directParticipants`, `taskId`, `lastMessageId`, `lastMessageSeq`, `lastMessageAt`, `archivedAt`, timestamps | Unique partial index cho `directKey` khi type=direct; unique partial index cho `taskId` khi type=task |
| `Message` | `conversationId`, `senderId`, `clientMessageId`, `sequence`, `type: text`, `text`, timestamps | Unique `(conversationId, sequence)`; unique `(conversationId, senderId, clientMessageId)` |
| `ConversationMember` | `conversationId`, `userId`, `lastReadSequence`, `joinedAt`, `revokedAt` | Unique `(conversationId, userId)`; index `(userId, revokedAt, conversationId)` |

- `directKey` là hai user ID sắp xếp rồi ghép ở server; tạo bằng upsert và xử lý duplicate-key để tránh hai phòng khi cùng nhấn nhắn tin.
- Với task, quyền vẫn được suy ra từ task/role hiện tại; member lưu trạng thái tham gia/đọc và người nhận thông báo, không thay thế policy.
- Khởi tạo phòng task phải tạo member cho người tạo và toàn bộ assignee hợp lệ trong cùng transaction; cập nhật danh sách đó khi giao việc thay đổi. Chỉ lọc các phòng mà người dùng “đã từng mở” sẽ làm người được giao bỏ lỡ phòng mới.
- `clientMessageId` do client tạo một lần và giữ nguyên khi retry. Server lấy `senderId` từ JWT, không nhận từ body.
- Tin văn bản trim, từ 1 đến 4.000 ký tự; render text bình thường, không render HTML trực tiếp.
- Gửi tin dùng MongoDB transaction: kiểm tra quyền, cấp sequence tăng dần cho hội thoại, lưu Message và cập nhật tin cuối. Chỉ phản hồi thành công/phát sự kiện sau commit. Retry cùng ID trả lại tin đã lưu.
- Transaction yêu cầu MongoDB replica set; cần xác minh môi trường thật và dùng `MongoMemoryReplSet` cho test chat thay vì MongoMemoryServer standalone hiện tại.
- Số chưa đọc được tính từ tin có `sequence > lastReadSequence` và người gửi khác user. Bản đầu chưa lưu counter riêng để giảm rủi ro sai lệch.
- Đánh dấu đọc bằng sequence của tin thực tế mà client đã hiển thị. Server xác minh tin thuộc phòng và chỉ tăng watermark bằng `$max`; không nhận thời gian đọc tùy ý từ client.
- Phân trang lịch sử theo sequence, không dùng offset lớn. Danh sách hội thoại có cursor `(lastMessageAt, _id)` và index hỗ trợ; truy vấn theo user tránh N+1.

## 6. API và sự kiện

Tất cả API yêu cầu `protect` và kiểm tra quyền hội thoại.

| Endpoint đề xuất | Chức năng |
| --- | --- |
| `GET /api/chat/users?search=&cursor=&limit=` | Tìm người để bắt đầu chat; chỉ trả ID, tên, ảnh và role cần thiết |
| `POST /api/chat/conversations/direct` | Body `{ userId }`; tạo hoặc trả hội thoại 1–1 có sẵn |
| `POST /api/chat/tasks/:taskId/conversation` | Tạo hoặc trả hội thoại task sau khi kiểm tra quyền |
| `GET /api/chat/conversations?type=&cursor=&limit=` | Danh sách người dùng đã tham gia và còn quyền, tin cuối, unread và tổng unread |
| `GET /api/chat/conversations/:id` | Metadata và quyền hiện tại; hỗ trợ mở từ link trực tiếp |
| `GET /api/chat/conversations/:id/messages?before=&limit=` | Tải trang cũ; trả cursor/hasMore |
| `GET /api/chat/conversations/:id/messages?after=&limit=` | Đồng bộ tin bị lỡ; lặp phân trang tới khi bắt kịp |
| `POST /api/chat/conversations/:id/messages` | Body `{ clientMessageId, text }`; lưu tin idempotent |
| `PUT /api/chat/conversations/:id/read` | Body `{ lastReadSequence }`; cập nhật watermark của chính user |

### Hợp đồng dữ liệu cho frontend

Metadata hội thoại trả về: `id`, `type`, `title`, `participants`, `lastMessage`, `lastMessageAt`, `unreadCount`, `viewerPermissions: { canRead, canSend }`. Với chat task bổ sung `task: { id, title, status, priority, dueDate, progress }`; với DM có thông tin đối tác và trạng thái tài khoản đã xóa.

- Danh sách trả `{ items, nextCursor, hasMore, unreadTotal }`; `unreadTotal` là tổng hội thoại còn quyền truy cập, độc lập với bộ lọc hiện tại.
- Lịch sử trả `{ items, nextBefore, nextAfter, hasMore }`; message có `id`, `conversationId`, `sender`, `sequence`, `clientMessageId`, `text`, `createdAt`.
- Gửi mới trả `201` và message chuẩn; retry cùng `clientMessageId` trả lại cùng message (`200`). Client merge theo ID/clientMessageId thay vì append mù.
- Cập nhật đọc trả watermark server chấp nhận; `403` luôn làm frontend ngừng đọc/gửi và bỏ cache tương ứng.
- UI chuyển đổi `Pending / In-Progress / Completed` sang nhãn hiển thị; không gửi các nhãn tiếng Việt ngược vào API.

Đề xuất mã lỗi: 400 dữ liệu không hợp lệ, 401 chưa xác thực, 403 không có quyền, 404 tài nguyên không tồn tại, 409 hội thoại đã đóng, 429 quá giới hạn.

Sự kiện server → client:

- `message:new`: tin đã lưu, ID, sequence và clientMessageId để merge với optimistic message.
- `conversation:updated`: yêu cầu cập nhật metadata, tin cuối và số chưa đọc qua REST.
- `conversation:read`: đồng bộ watermark giữa các thiết bị; đọc bởi người khác có thể hiển thị sau.
- `conversation:access-revoked`: xóa hội thoại khỏi UI/cache và chặn gửi.

Không coi event là nguồn dữ liệu duy nhất. Sau reconnect, focus lại tab và định kỳ khi tab đang hoạt động, client kiểm tra thay đổi bằng REST; điều này xử lý cả trường hợp server đã commit nhưng lỗi trước khi emit. Nếu cần đảm bảo phát sự kiện kể cả qua crash mà không chờ đối soát, bổ sung transactional outbox ở giai đoạn nâng cao.

## 7. Tích hợp giao diện và file dự kiến

Yêu cầu giao diện: kế thừa `NavBar`, `SideMenu`, `DashboardLayout`, `PageContainer`, font Open Sans, màu và dark mode đang dùng. Thêm menu Chat theo role, dùng kích thước chữ/nút/thẻ tương ứng với các trang hiện tại. Trong bản mẫu, chọn User/Admin ở ô điều khiển dưới sidebar để xem đúng menu của từng vai trò; thông tin tài khoản hiển thị là dữ liệu minh họa.

- Thêm `/admin/chat` và `/user/chat`, hỗ trợ `?conversation=<id>` để mở trực tiếp; hai route dùng chung một trang.
- Menu “Chat” có badge tổng chưa đọc; desktop gồm danh sách bên trái và hội thoại bên phải, mobile chuyển giữa hai màn hình.
- Thêm nút “Nhắn tin” ở `TeamMembersView.jsx` và nút tạo chat từ danh bạ trong trang Chat.
- Thêm phần “Thảo luận” trong `TaskDetailsPage.jsx`; dùng chung `ConversationPanel` với trang Chat và có link mở toàn màn hình.
- Chỉ tự cuộn nếu đang gần cuối hoặc chính mình gửi. Khi đọc tin cũ, hiện nút có tin mới; tải thêm phía trên phải giữ vị trí cuộn.
- Chỉ đánh dấu đọc khi hội thoại đang mở, tab hiển thị và tin đã được xem. Tin tự gửi không làm tăng unread.
- Khi gửi thất bại giữ nội dung/ID để retry; không báo đã giao/đã đọc chỉ vì REST trả thành công.
- Badge chat là nguồn thông báo chính của MVP. Chưa tạo một Notification cho từng tin, tránh làm tràn dropdown hiện tại vốn chỉ lấy 50 bản ghi.

```text
backend/
  app.js                              # Express app dùng lại cho test/server
  server.js                           # bootstrap HTTP và Socket.IO
  models/{Conversation,Message,ConversationMember}.js
  controllers/chatController.js
  routes/chatRoutes.js
  services/{chatService,chatAccessService}.js
  realtime/{socketServer,socketAuth}.js

frontend/Task-Manager/src/
  pages/Chat/ChatPage.jsx
  components/chat/{ConversationList,ConversationPanel,MessageList,MessageComposer,NewChatDialog}.jsx
  components/chat/{ConversationInfoPanel,TaskDiscussionPanel,ChatEmptyState}.jsx
  components/chat/{FloatingChatDock,MiniChatWindow,ChatLauncher,QuickConversationPicker}.jsx
  context/chatContext.jsx
  hooks/useConversation.js
  utils/{chatApi,socketClient}.js

tests/backend-tests/{chat,chat-socket}.test.js
frontend/Task-Manager/src/tests/components/chat/
frontend/Task-Manager/src/tests/context/chatContext.test.jsx
```

File cần sửa: `App.jsx`, `utils/apiPaths.js`, `utils/data.js`, `SideMenu.jsx`, `TeamMembersView.jsx`, `TaskDetailsPage.jsx`, backend task/user controllers, package manifests và env example. `Notification`/dropdown chỉ cần sửa khi thêm thông báo chat nâng cao.

Khi tách app/server, cập nhật helper test đang tự mount route để dùng chung app factory hoặc bổ sung route chat nhất quán; không để test chỉ chạy một bản app khác production.

## 8. Thứ tự triển khai và mốc hoàn thành

Ước lượng dưới đây dành cho một lập trình viên quen dự án, chưa gồm chờ cấu hình hạ tầng hoặc thay đổi yêu cầu. Các giai đoạn thực hiện tuần tự theo phụ thuộc.

| Giai đoạn | Công việc | Đầu ra có thể nghiệm thu | Ước lượng |
| --- | --- | --- | --- |
| 0 | Đo baseline test/build; chốt policy; xác minh MongoDB replica set; spike Vercel/Socket.IO và adapter | Quyết định môi trường, hai client nhận được sự kiện và reconnect thành công | 0,5–1 ngày |
| 1 | Model, index, quyền truy cập, API hội thoại/tin nhắn/đọc và test tích hợp | Gửi và đọc được qua REST; không tạo phòng/tin trùng; chặn truy cập trái quyền | 2–3 ngày |
| 2 | Socket auth, user rooms, emit sau commit, reconnect và đồng bộ | Hai tài khoản nhận tin, nhiều tab nhất quán, mất mạng không mất tin đã lưu | 1–2 ngày |
| 3 | ChatPage, provider, composer, lịch sử, optimistic UI, badge và Team Members | Chat 1–1 dùng được trên desktop/mobile | 2–3 ngày |
| 4 | Khung chat task; đồng bộ giao việc, role, xóa task/user | Chat task tuân theo quyền hiện tại trên mọi kết nối | 1–2 ngày |
| 5 | Kiểm thử xuyên luồng, giới hạn tải, staging, log lỗi và tài liệu vận hành | Bản MVP đạt checklist, sẵn sàng xem xét phát hành | 1–2 ngày |

Tổng dự kiến: **7,5–13 ngày làm việc** cho chat văn bản 1–1 và theo task. Ảnh đính kèm cùng typing/presence dự kiến thêm 2–4 ngày, cần xem lại sau khi chốt quyền truy cập file.

Chat nổi dùng lại nền tảng trên, dự kiến thêm **1–2 ngày** cho quản lý cửa sổ, chuyển full page, mobile và kiểm thử đồng bộ. Tổng cho hai loại chat kèm khung nổi: **8,5–15 ngày làm việc**; ảnh/typing/presence vẫn là hạng mục sau.

### Phân công backend/frontend theo đầu việc

| Mã | Backend | Frontend | Điều kiện bàn giao |
| --- | --- | --- | --- |
| CHAT-01 | Access service, models, indexes, DTO và mã lỗi | Component shell, responsive, dữ liệu giả đúng DTO | Cả hai luồng hiển thị bằng cùng cấu trúc dữ liệu |
| CHAT-02 · 1–1 | Danh bạ, get-or-create cặp user, API history/send/read | Danh bạ modal, nút Nhắn tin, danh sách và khung DM | Hai tài khoản mở cùng phòng, có lịch sử và retry |
| CHAT-03 · realtime | Socket auth, user rooms, emit sau commit, adapter theo môi trường | Provider sống qua route, merge tin, reconnect/resync, badge | Tin đến mọi thiết bị, không tạo listener hoặc tin trùng |
| CHAT-04 · task | Get-or-create theo task; đồng bộ creator/assignee; metadata | Bộ lọc Công việc, context panel, thảo luận trong task details | Cùng một lịch sử ở trang Chat và trang task |
| CHAT-05 · quyền | Thu hồi khi giao việc/role/task/user đổi, kể cả cascade | Cache eviction, read-only, thông báo mất quyền và điều hướng | Các kết nối cũ không nhận/gửi được nội dung trái quyền |
| CHAT-06 · hoàn thiện | Integration tests, transaction rollback, rate limits, staging logs | Empty/loading/offline/error, keyboard, mobile/dark, kiểm tra cuộn | Hoàn thành checklist mục 9 và kiểm thử hai tài khoản |
| CHAT-07 · chat nổi | Dùng lại API/events; kiểm tra đọc và thu hồi quyền với nhiều giao diện | Launcher, popup, thu nhỏ/đóng, tối đa hai khung, mobile và chuyển full page | Một lịch sử/bản nháp, một socket; đóng giao diện không xóa tin |

Các mã trên là đầu việc dự kiến, chưa tạo issue hoặc triển khai API. Thứ tự phát hành: nền tảng chung → 1–1 → task → chat nổi → kiểm thử xuyên luồng.

## 9. Checklist kiểm thử và nghiệm thu

### Backend và realtime

- Hai request cùng tạo chat 1–1/task vẫn chỉ có một hội thoại.
- Retry cùng clientMessageId, kể cả sau timeout, chỉ lưu một tin; sequence và tin cuối nhất quán.
- Người ngoài phòng không xem, gửi, đọc hay đăng ký nhận tin; admin không đọc được DM của người khác.
- User bị bỏ khỏi task không nhận nội dung mới trên socket đã mở; kiểm tra cả tab thứ hai và instance khác.
- Giảm role admin, xóa user, xóa task trực tiếp và xóa task qua deleteUser đều thu hồi quyền đúng.
- Token sai/hết hạn, user không còn tồn tại và quá giới hạn gửi đều được xử lý rõ.
- Hai người gửi đồng thời, phân trang trước/sau và đọc từ nhiều thiết bị không mất/trùng tin; watermark không lùi.
- Mất kết nối giữa commit và response/emit, restart backend và reconnect sang instance khác đều khôi phục được bằng REST.

### Frontend và trải nghiệm thực tế

- Mở chat từ Team Members, menu, task details và link trực tiếp đều đến đúng phòng.
- Đổi route không tạo thêm kết nối/listener; kiểm tra mount/cleanup trong React StrictMode hiện có.
- Người dùng xem được trạng thái gửi lỗi và retry; nội dung HTML/script chỉ hiển thị như văn bản.
- Badge không tăng vì tin tự gửi; xem phòng khác/tab nền không tự đánh dấu đọc.
- Tải lịch sử giữ vị trí cuộn; tin mới không kéo người dùng khỏi đoạn đang đọc.
- Thử thủ công hai tài khoản, hai tab, offline/online, mobile và dark mode.
- Với chat nổi: mở/thu/khôi phục/đóng, hai cửa sổ, chuyển route, gửi và giữ nháp khi mở full page; mobile chuyển sang chat đầy đủ. Kiểm tra thu nhỏ không đánh dấu đọc và thu hồi quyền đóng mọi giao diện.

Chạy kiểm tra hiện có từ đúng thư mục, sau khi ghi nhận baseline:

```text
tests:                         npm run test:backend
frontend/Task-Manager:          npm test
frontend/Task-Manager:          npm run build
frontend/Task-Manager:          npm run lint
```

Baseline trước tính năng chat: 193/193 test pass và frontend build pass; lint ứng dụng còn lỗi có sẵn như mục 1. Bản mẫu giao diện có kiểm tra riêng tại `design/chat/README.md`; chưa có API chat thật hoặc thử deploy chat.

## 10. Các quyết định cần kiểm chứng khi bắt đầu

1. Backend production thực tế có dùng Vercel không; path Socket.IO, timeout, adapter chia sẻ và môi trường preview hoạt động thế nào.
2. MongoDB có hỗ trợ transaction; cần chuẩn bị replica set cho local/test chat.
3. Người mới được giao task xem toàn bộ lịch sử và admin có quyền xem chat task là chính sách mặc định được đề xuất, cần thể hiện rõ trong UX/tài liệu sản phẩm.
4. Ước lượng số người dùng đồng thời, kích thước lịch sử và thời hạn lưu trữ để chọn giới hạn vận hành; chưa có số liệu trong repo.
5. Với ảnh ở giai đoạn sau: URL Cloudinary hiện tại là URL công khai; phải thiết kế kiểm soát truy cập nếu muốn ảnh chỉ dành cho thành viên hội thoại.

Ưu tiên bắt đầu từ nền tảng dữ liệu/quyền và API, sau đó hoàn thiện chat 1–1 trước khi tích hợp đầy đủ vòng đời task.

## 11. Giao diện mẫu và cách xem

Mở [`design/chat/index.html`](design/chat/index.html) bằng trình duyệt, không cần cài thêm package. Có bốn nút chọn màn hình, bộ lọc hội thoại, tìm theo tên/task, chọn người để nhắn tin, gửi văn bản mẫu, đổi sáng/tối, chat nổi và giao diện mobile.

| Màn hình | Mục đích |
| --- | --- |
| [01 · Chat cá nhân](design/chat/index.html?view=direct) | Danh sách bên trái, tin nhắn ở giữa, thông tin người nhận và quyền riêng tư bên phải |
| [02 · Chat theo task](design/chat/index.html?view=task) | Cùng khung chat, bổ sung trạng thái, người tham gia, tiến độ và lối mở task |
| [03 · Thảo luận trong chi tiết task](design/chat/index.html?view=details) | Trang Task Details thực tế, thêm thảo luận trong cột nội dung, giữ cột trạng thái và thông tin người tham gia |
| [04 · Chat nổi trong lúc xem task](design/chat/index.html?view=details&dock=anh) | Nhắn riêng ở góc dưới, thu nhỏ/khôi phục hoặc mở trang Chat; vẫn xem task phía sau |

### 01 · Chat cá nhân 1–1

![Chat cá nhân 1–1](design/chat/previews/direct-chat.png)

[Xem mẫu với menu Admin](design/chat/previews/admin-chat.png).

### 02 · Chat theo task công việc chung

![Chat theo task](design/chat/previews/task-chat.png)

### 03 · Thảo luận ngay trong chi tiết task

![Thảo luận trong chi tiết task](design/chat/previews/task-details-chat.png)

### Mobile và dark mode

![Chat task trên mobile](design/chat/previews/mobile-chat.png)

![Chat task giao diện tối](design/chat/previews/dark-task-chat.png)

### 04 · Chat nổi ở dưới màn hình

![Hai khung chat nổi trong lúc xem task](design/chat/previews/floating-chat.png)

![Thu nhỏ khung chat nổi](design/chat/previews/floating-chat-minimized.png)

Bản mẫu chạy độc lập bằng bundle tái sử dụng component React/CSS thực tế của dự án; chưa thêm tính năng chat vào route production. Dữ liệu hội thoại, thành viên và công việc đều là ví dụ. Gửi thử chỉ thay đổi dữ liệu trong bộ nhớ; tải lại trang sẽ trở về mẫu. Các quyền mô tả ở đây là yêu cầu cho backend khi triển khai, không phải cơ chế bảo vệ có trong demo.
