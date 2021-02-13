class WebSocketMessage {
  constructor(From, MessageType, Message) {
    this.From = From;
    this.MessageType = MessageType;
    this.Message = Message;
  }
}

class TextMessage {
  constructor(Message) {
    this.Message = Message;
  }
}

class IdentificationMessage {
  constructor(Username, Color, HasSound, HasVideo) {
    this.Username = Username;
    this.Color = Color;
    this.HasSound = HasSound;
    this.HasVideo = HasVideo;
  }
}

class UserStatusChangedMessage {
  constructor(Status, HasVideo, HasSound) {
    this.Status = Status;
    this.HasVideo = HasVideo;
    this.HasSound = HasSound;
  }
}

class MultimediaConnectionRequestMessage {
  constructor(UsernameTo, Offer) {
    this.UsernameTo = UsernameTo;
    this.Offer = Offer;
  }
}

class MultimediaConnectionResponseMessage {
  constructor(UsernameTo, Response) {
    this.UsernameTo = UsernameTo;
    this.Response = Response;
  }
}

class MultimediaConnectionIceCandidateMessage {
  constructor(UsernameTo, Candidate) {
    this.UsernameTo = UsernameTo;
    this.Candidate = Candidate;
  }
}


class RTCMessage {
  constructor(t, m) {
    this.t = t;
    this.m = m;
  }
}