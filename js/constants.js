/* ==========================================================================
   CONSTANTS.JS - ĐỊNH NGHĨA HẰNG SỐ VÀ CÁC BIẾN TOÀN CỤC DÙNG CHUNG
   ========================================================================== */

const GAME_MODES = {
    NORMAL: "normal",
    SECRET: "find-secret-sentence"
};

const PLAYER_COLORS = [
    { main: '#ff6b8b', soft: '#ffe3e8', border: 'rgba(255,107,139,0.2)' }, // Hồng Pastel
    { main: '#3867d6', soft: '#e8f0fe', border: 'rgba(56,103,214,0.2)' }, // Xanh Dương Pastel
    { main: '#fa8231', soft: '#fef0e6', border: 'rgba(250,130,49,0.2)' },  // Cam Pastel
    { main: '#8c7ae6', soft: '#f1effb', border: 'rgba(140,122,230,0.2)' }  // Tím Pastel
];

const DEFAULT_FALLBACK_CONTENT = {
    question: "Bạn thích điểm nào nhất ở người đối diện?",
    dare: "Uống một ngụm nước lọc và làm mặt xấu trong 10 giây.",
    gift: "Bạn nhận được một cái ôm ấm áp từ mọi người!",
    punish: "Bị búng tai 1 cái nhẹ từ người bên cạnh.",
    secret: "Túi mù này trống rỗng."
};

const THEME_SUGGESTIONS = {
    friend: {
        question: [
            "Tật xấu đáng yêu nhất của bạn là gì?",
            "Lần gần nhất bạn khóc vì điều gì?",
            "Nếu có 1 ngày làm người vô hình, bạn sẽ làm gì?",
            "Bí mật ngớ ngẩn nhất bạn từng giấu bố mẹ?",
            "Bạn từng nói dối bạn bè chuyện gì chưa?"
        ],
        dare: [
            "Hát một đoạn ca khúc thiếu nhi bằng giọng say rượu.",
            "Cho mọi người xem ảnh dìm gần nhất trong máy bạn.",
            "Nhắn tin cho bạn thân: 'Tao vừa trúng số!' và chụp lại.",
            "Ăn một thìa nước tương/tương cà nguyên chất.",
            "Làm động tác loài khỉ trong 15 giây."
        ],
        gift: [
            "Được miễn hình phạt kế tiếp trong ván chơi.",
            "Người bên cạnh phải rót nước cho bạn uống.",
            "Nhận một cái xoa đầu từ người đối diện.",
            "Yêu cầu 1 người làm trò vui cho bạn cười.",
            "Nhận 1 lời khen thật lòng nhất từ đối thủ."
        ],
        punish: [
            "Uống cạn ly nước trước mặt bạn.",
            "Làm mặt xấu bựa nhất cho mọi người chụp ảnh.",
            "Để người bên trái vẽ 1 hình ngộ nghĩnh lên tay.",
            "Đứng lò cò trong vòng 30 giây tiếp theo.",
            "Không được nói từ 'không' trong 2 lượt tới."
        ]
    },
    couple: {
        question: [
            "Ấn tượng đầu tiên của bạn về nửa kia là gì?",
            "Hành động lãng mạn nhất đối phương từng làm?",
            "Bạn thích ôm hay hôn đối phương ở đâu nhất?",
            "Bạn có giấu nửa kia chuyện mua sắm gì không?",
            "Điều gì ở nửa kia khiến bạn dễ mềm lòng nhất?"
        ],
        dare: [
            "Nhìn thẳng vào mắt đối phương trong 30 giây không cười.",
            "Hôn nhẹ lên trán đối phương thật ngọt ngào.",
            "Nói 3 từ miêu tả sự quyến rũ của người ấy.",
            "Nhắn tin tỏ tình ngọt sến cho đối phương ngay lập tức.",
            "Bế bổng đối phương lên hoặc cõng đi 1 vòng phòng."
        ],
        gift: [
            "Được đối phương đấm bóp vai gáy trong 2 phút.",
            "Được đối phương hôn má 1 cái.",
            "Được quyền bắt đối phương làm 1 việc vặt ngày mai.",
            "Yêu cầu đối phương hát tặng bạn một đoạn tình ca.",
            "Được đối phương đút cho ăn/uống 1 miếng."
        ],
        punish: [
            "Chịu phạt giặt đồ/rửa chén vào ngày mai.",
            "Để đối phương véo má bạn cưng nựng trong 10 giây.",
            "Nói 1 câu xin lỗi ngọt ngào cho lỗi lầm cũ.",
            "Để đối phương tự chọn hình phạt búng tai nhẹ.",
            "Đóng vai người hầu của đối phương trong 5 phút kế."
        ]
    }
};

// BIẾN TOÀN CỤC DÙNG CHUNG (Khai báo ở tệp nạp đầu tiên để tránh lỗi Reference/Scope)
let audioCtx = null;
let isProcessingAction = false;
let lastFocusedElement = null;

// MÃ HÓA & GIẢI MÃ NỘI DUNG (BASE64 AN TOÀN)
function encryptContent(text) {
    try {
        return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
        return btoa(text);
    }
}

function decryptContent(encodedText) {
    try {
        return decodeURIComponent(escape(atob(encodedText)));
    } catch (e) {
        return atob(encodedText);
    }
}
const PLAY_TYPES = Object.freeze({ LOCAL: "local", ONLINE: "online" });
