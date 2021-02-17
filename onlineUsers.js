var onlineUsers = [];

const talkingDistanceDropOfs = [
    [50, 0],
    [45, 0.1],
    [40, 0.2],
    [30, 0.4],
    [0, 1]
];

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
    constructor(newUsername, color, hasSound, hasVideo) {
        this.username = newUsername;
        if (newUsername.length < 3)
            throw new Exception("name is to small");
        this.initials = newUsername.substring(0, 2);
        this.color = color;
        this.hasVideo = hasVideo;
        this.hasSound = hasSound;
        this.peerConnection;
        this.audioVolume = 0.0;
        this.audioMetter = null;
        this.position = [-1, -1];
        this.volume = 1;
        this.isDead = false;
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

    setIsDead(isDead) {
        this.isDead = isDead;
        setPosition(this.position);
    }

    setPosition(newPosition) {
        this.position = newPosition;

        if (!this.peerConnection)
            this.peerConnection = getPeerConnectionOfUsername(this.username);

        if(this.isDead) {
            if (this.volume != 0) {
                this.volume = 0;
                this.peerConnection.setAudioLevel(0);
            }
            return;
        }

        var a = globalLocationPoint[0] - this.position[0];
        var b = globalLocationPoint[1] - this.position[1];

        var distance = Math.sqrt(a * a + b * b);
        let volumeToSet = getDropOfByDistance(distance);

        if (volumeToSet == this.volume) {
            return;
        }

        console.log(this.username + " volume set to " + volumeToSet);
        this.volume = volumeToSet;
        this.peerConnection.setAudioLevel(volumeToSet);
    }
}


function getDropOfByDistance(distance) {
    for (let i = 0; i < talkingDistanceDropOfs.length; i++) {
        const talkingDistanceDrop = talkingDistanceDropOfs[i];
        if (distance >= talkingDistanceDrop[0])
            return talkingDistanceDrop[1];
    }
    return 1;
}