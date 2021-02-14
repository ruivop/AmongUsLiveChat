const talkingDistance = 50;

var onlineUsers = [];

function getOnlineUserByUsername(username) {
    return onlineUsers.filter(ou => ou.username == username)[0];
}

function addOrUpdateOnlineUsers(username, color, hasSound, hasVideo) {
    if (!username)
        throw new Exception("username must have a value");

    const foundUsernames = onlineUsers.filter(ou => ou.username == username);
    if (foundUsernames[0]) {
        foundUsernames[0].color = color;
        foundUsernames[0].hasSound = hasSound;
        foundUsernames[0].hasVideo = hasVideo;
    }

    onlineUsers.push(new OnlineUser(username, color, hasSound, hasVideo));
}

function removeOnlineUser(username) {
    const fondUser = onlineUsers.filter(ou => ou.username == username)[0];
    fondUser.stop();

    onlineUsers = onlineUsers.filter(ou => ou.username != username);
}


function createAllPeerConnections() {
    onlineUsers.filter(ou => ou.username != username)
        .forEach(onlineUser => {
            onlineUser.createPeerConnection();
        });
}

class OnlineUser {
    constructor(username, color, hasSound, hasVideo) {
        this.username = username;
        if (username.length < 3)
            throw new Exception("name is to small");
        this.initials = username.substring(0, 2);
        this.color = color;
        this.hasVideo = hasVideo;
        this.hasSound = hasSound;
        this.peerConnection;
        this.audioVolume = 0.0;
        this.audioMetter = null;
        this.position = [-1, -1];
        this.volume = 0;
    }

    createPeerConnection() {
        this.peerConnection = getPeerConnectionOfUsername(this.username);
        console.log(this.peerConnection);
        if (this.peerConnection.state == "new") {
            this.peerConnection.CreateWebrtcOffer();
        }
    }

    setAudioMetter(audioMetter) {
        this.audioMetter = audioMetter;
    }

    setAudioVolume(newVolume) {
        this.audioVolume = newVolume;
    }

    stop() {
        this.audioMetter.stop();
    }

    setPosition(newPosition) {
        this.position = newPosition;

        var a = globalLocationPoint[0] - this.position[0];
        var b = globalLocationPoint[1] - this.position[1];

        var distance = Math.sqrt(a * a + b * b);
        let volumeToSet = 0;
        if (distance > talkingDistance) {
            volumeToSet = 0;
        } else {
            volumeToSet = 1;
        }
        if (volumeToSet == this.volume) {
            return;
        }
        if(!this.peerConnection)
            this.peerConnection = getPeerConnectionOfUsername(this.username);

        console.log("volume set to " + volumeToSet);
        console.log(this.peerConnection);
        console.log(this.username);
        this.volume = volumeToSet;
        this.peerConnection.setAudioLevel(volumeToSet);
    }
}