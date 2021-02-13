function pictureInpicturePlayerTalking() {
    const canvas = document.getElementById('audioCanvas');
    const video = document.createElement('video');
    video.id = "videoplayers";
    video.muted = true;
    video.controls = true;
    video.srcObject = canvas.captureStream();
    video.play();
    drawTalkingPlayers();
    video.onloadedmetadata = function () {
        if (typeof video.requestPictureInPicture === 'function') {
            video.requestPictureInPicture();
            return;
        }
        document.body.appendChild(video);
        alert('Por favor clicar com o botão esquedo no video e depois em "Vídeo em janela flutuante"');
    }
};

var chartColors = {
    red: "#C51111",
    blue: "#132ED1",
    green: "#117F2D",
    pink: "#ED54BA",
    orange: "#EF7D0E",
    yellow: "#F6F658",
    black: "#3F474E",
    white: "#D6E0F0",
    purple: "#6B31BC",
    brown: "#71491E",
    cyan: "#38FEDB",
    lime: "#50EF39",
};

function drawTalkingPlayers() {
    var canvas = document.getElementById('audioCanvas');
    if (canvas.getContext) {
        var ctx = canvas.getContext('2d');

        //background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        //bubbles
        const mainLeftBorder = 40;
        const mainTopBorder = 30;
        const bottomBorder = 50;
        const rightBorder = 55;
        const radius = 30;
        const textSize = 50;
        for (let r = 0; r < onlineUsers.length / 5; r++) {
            let numUsersLine = 5;
            if (r == Math.floor(onlineUsers.length / 5))
                numUsersLine = onlineUsers.length % 5;
            for (let i = 0; i < numUsersLine; i++) {
                ctx.beginPath();
                ctx.fillStyle = onlineUsers[r * 5 + i].color;
                ctx.moveTo(mainLeftBorder + radius + i * (rightBorder + radius * 2), mainTopBorder + radius + r * (bottomBorder + radius * 2));
                ctx.arc(mainLeftBorder + radius + i * (rightBorder + radius * 2), mainTopBorder + radius + r * (bottomBorder + radius * 2), 50, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.beginPath();
                ctx.strokeStyle = "black";
                let factor = 1;
                if (onlineUsers[r * 5 + i].audioVolume > 0.01) {
                    factor = 5;
                    ctx.strokeStyle = 'DarkKhaki';
                }
                else
                    ctx.strokeStyle = 'black';
                ctx.lineWidth = factor + onlineUsers[r * 5 + i].audioVolume * 20;
                ctx.arc(mainLeftBorder + radius + i * (rightBorder + radius * 2), mainTopBorder + radius + r * (bottomBorder + radius * 2), 50, 0, Math.PI * 2, true);
                ctx.stroke();

                ctx.font = "bold " + textSize + "px Arial";
                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.fillText(onlineUsers[r * 5 + i].initials, mainLeftBorder + radius + i * (rightBorder + radius * 2), (textSize / 3) + mainTopBorder + radius + r * (bottomBorder + radius * 2));
                ctx.strokeStyle = "black";
                ctx.lineWidth = 2;
                ctx.strokeText(onlineUsers[r * 5 + i].initials, mainLeftBorder + radius + i * (rightBorder + radius * 2), (textSize / 3) + mainTopBorder + radius + r * (bottomBorder + radius * 2));
            }
        }

        //status
        ctx.fillStyle = "black";
        ctx.fillText("Preparado", 300, 280);
    }
}

setInterval(() => {
    drawTalkingPlayers();
}, 50);
