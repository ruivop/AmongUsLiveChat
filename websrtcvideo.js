let localStream;
var localPeerConnections = [];

function getPeerConnectionOfUsername(usernameToSerach) {
    if (!usernameToSerach)
        throw new Exception("username must have a value");
    if (usernameToSerach == username)
        return null;

    let localEmptyPeer;
    for (let index = 0; index < localPeerConnections.length; index++) {
        const localPeer = localPeerConnections[index];
        if (localPeer.remoteUsername == usernameToSerach)
            return localPeer;
        else if (localPeer.remoteUsername == null)
            localEmptyPeer = localPeer;
    }

    localEmptyPeer = new LocalPeerConnection(usernameToSerach);
    localPeerConnections.push(localEmptyPeer);
    return localEmptyPeer;
}

function closePeerConnection(usernameToClose) {
    for (let index = 0; index < localPeerConnections.length; index++) {
        const localPeer = localPeerConnections[index];
        if (localPeer.remoteUsername == usernameToClose) {
            localPeer.close();
            //removes the item from the array
            localPeerConnections = localPeerConnections.filter(function (item) {
                return item !== localPeer
            });
            console.log("Removed " + usernameToClose);
            console.log(localPeerConnections);
            return;
        }
    }
    console.log("Did not remove!!!!");
}

function sendMessageToAll(type, message) {
    for (let index = 0; index < localPeerConnections.length; index++) {
        const localPeer = localPeerConnections[index];
        localPeer.sendMessage(new RTCMessage(type, message));
    }
}

function startMyMedia() {
    if (localStream)
        return;

    const constraints = {
        'video': false,
        'audio': true
    };

    console.log("startMedia");

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            let audioElement = $('<p>Local:</p><audio id="localAudio" autoplay playsinline controls muted></audio>');
            $("#inputoutput").append(audioElement);
            const videoElement = $('#localAudio')[0];
            videoElement.srcObject = stream;
            localStream = stream;

            startMesuringAudio(username, stream);

            didShareTheMic();
            
            pictureInpicturePlayerTalking();

            OpenWebSocket();
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
            alert("To comunicate you mmust share the microphone: " + error);
        });
}

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
class LocalPeerConnection {

    constructor(remoteUsername) {
        this.peerConnection;
        this.remoteUsername = remoteUsername;
        this.state = "new";
        this.dataChannel;
        this.audioElement = null;
    }

    async CreateWebrtcOffer() {
        this.CreatePeerConnection();

        this.setDatachanelEvents(this.peerConnection.createDataChannel('peerConnection'));
        const offer = await this.peerConnection.createOffer(offerOptions);
        await this.peerConnection.setLocalDescription(offer);

        var tosend = new WebSocketMessage(username, "MultimediaConnectionRequestMessage", new MultimediaConnectionRequestMessage(this.remoteUsername, JSON.stringify(offer)));
        socket.send(JSON.stringify(tosend));

        this.state = "connecting";
    }

    async CreateWebrtcResponse(remoteOffer) {
        this.CreatePeerConnection();

        this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        var tosend = new WebSocketMessage(username, "MultimediaConnectionResponseMessage", new MultimediaConnectionResponseMessage(this.remoteUsername, JSON.stringify(answer)));
        socket.send(JSON.stringify(tosend));

        this.state = "connected";
    }

    async SetResponseOffer(remoteResponseOffer) {
        try {
            const remoteDesc = new RTCSessionDescription(remoteResponseOffer);
            await this.peerConnection.setRemoteDescription(remoteDesc);

            console.log('Set session description success.');
        } catch (e) {
            console.log(`Failed to set session description: ${e.toString()}`);
        }
        this.state = "connected";
    }

    async CreatePeerConnection() {
        console.log('Starting call');

        const servers = {
            iceServers:
                [
                    {
                        'urls': 'stun:stun.l.google.com:19302'
                    },
                    {
                        'urls': 'turn:turn.ruivoptest1.site:3478',
                        'credential': 's1omepassword',
                        'username': 'ruivop2'
                    }
                ]
        };

        window.peerConnection = this.peerConnection = new RTCPeerConnection(servers);
        console.log('Created local peer connection object localPeerConnection');
        this.peerConnection.onicecandidate = e => this.onIceCandidate(e);
        this.peerConnection.ontrack = e => this.gotRemoteStream(e);
        this.peerConnection.addEventListener('datachannel', event => {
            this.setDatachanelEvents(event.channel);
        });

        this.setStreamTracksToConnection();
    }

    setStreamTracksToConnection() {
        if (!localStream)
            return;

        const videoTracks = localStream.getVideoTracks();
        const audioTracks = localStream.getAudioTracks();

        if (videoTracks.length > 0) {
            console.log(`Using video device: ${videoTracks[0].label}`);
        }

        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}`);
        }

        console.log(this.peerConnection);
        localStream.getTracks()
            .forEach(track => this.peerConnection.addTrack(track, localStream));
        console.log('Adding Local Stream to peer connection');
    }

    gotRemoteStream(e) {
        this.audioElement = $('<div id="testAudioElement' + this.remoteUsername + '"><p>Remote ' + this.remoteUsername + ':</p><audio class="bordered" id="remoteAudio' + this.remoteUsername + '" autoplay controls playsinline></audio></div>');
        $("#inputoutput").append(this.audioElement);
        this.audioElement = $("#remoteAudio" + this.remoteUsername)[0];
        if (this.audioElement.srcObject !== e.streams[0]) {
            this.audioElement.srcObject = e.streams[0];
            startMesuringAudio(this.remoteUsername, e.streams[0]);
            console.log('Received remote stream');
        }
    }

    setAudioLevel(newVolume) {
        if (this.audioElement) {
            this.audioElement.volume = newVolume;
        }
    }

    async onIceCandidate(event) {
        console.log(`localPeerConnection ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);

        var tosend = new WebSocketMessage(username, "MultimediaConnectionIceCandidateMessage", new MultimediaConnectionIceCandidateMessage(this.remoteUsername, JSON.stringify(event.candidate)));
        socket.send(JSON.stringify(tosend));
    }

    async OnRemoteIceCandidate(remoteIceCandidate) {
        if (!remoteIceCandidate)
            return;
        this.peerConnection.addIceCandidate(remoteIceCandidate);
    }

    setDatachanelEvents(datachanel) {
        this.dataChannel = datachanel;
        this.dataChannel.addEventListener('open', event => {
            console.log("dataChannel opened");
            var tosend = new RTCMessage("TextMessage", username + " is Online!");
            this.dataChannel.send(JSON.stringify(tosend));
        });
        this.dataChannel.addEventListener('close', event => {
            console.log("dataChannel closed");

            var toNotify = new RTCMessage("TextMessage", this.remoteUsername + " is offline...");
            hadlePeerMessage(this.remoteUsername, JSON.stringify(toNotify));
        });
        this.dataChannel.addEventListener('message', event => {
            hadlePeerMessage(this.remoteUsername, event.data);
        });
    }

    sendMessage(messageToSend) {
        if (this.dataChannel)
            this.dataChannel.send(JSON.stringify(messageToSend));
    }

    close() {
        this.peerConnection.close();
    }
}