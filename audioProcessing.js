window.AudioContext = window.AudioContext || window.webkitAudioContext;

function startMesuringAudio(username, stream) {
    const onlineUser = getOnlineUserByUsername(username);
    const soundMeter = new SoundMeter(onlineUser);
    onlineUser.setAudioMetter(soundMeter);
    soundMeter.connectToSource(stream);
}

function SoundMeter(user) {
    this.instant = 0.0;
    this.user = user;
    try {
        this.context = new AudioContext();
    } catch (e) {
        alert('Web Audio API not supported.');
        return;
    }
    this.script = this.context.createScriptProcessor(2048, 1, 1);
    const that = this;
    this.script.onaudioprocess = function (event) {
        const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
        }
        that.instant = Math.sqrt(sum / input.length);
        that.user.setAudioVolume(that.instant);
    };
    /*
    this.meterRefresh = setInterval(() => {
        
    }, 50);*/
}

SoundMeter.prototype.connectToSource = function (stream) {
    console.log('SoundMeter connecting');
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
    } catch (e) {
        console.error(e);
        alert(e);
    }
};

SoundMeter.prototype.stop = function () {
    console.log('SoundMeter stopping');
    this.mic.disconnect();
    this.script.disconnect();
};