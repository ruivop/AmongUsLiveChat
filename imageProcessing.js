const smallFactor = 0.5;
const videoNormalHeight = 124 * smallFactor;
const videoTextAnalysisHeight = 500;
var globalLocationPoint = [140, 221];

var isDebuggingImageProcessing = false;
var isRunning = true;

var shouldCheckForVotingScreen = true;//todo:Change to false
var shouldCheckForDeathScreen = true;
var isRecordingKillByVotingScreen = false;

async function startScreenCapture() {

    const mapImage = document.querySelector('#imageSrc');
    const deathSreenImage = document.querySelector('#imageDeathScreen');
    const imageVotingScreen = document.querySelector('#imageVotingScreen');
    mapImage.height *= smallFactor;
    mapImage.width *= smallFactor;
    let deathImageWidthFactor = deathSreenImage.height / videoNormalHeight;
    deathSreenImage.height = videoNormalHeight;
    deathSreenImage.width = deathSreenImage.width / deathImageWidthFactor;
    let votingImageWidthFactor = imageVotingScreen.height / videoNormalHeight;
    imageVotingScreen.height = videoNormalHeight;
    imageVotingScreen.width = imageVotingScreen.width / votingImageWidthFactor;

    const constraints = {
        video: {
            cursor: 'never',
            displaySurface: 'application'
        }
    };
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const videoElement = document.querySelector('video#localVideo');
    videoElement.height = videoNormalHeight;
    videoElement.srcObject = stream;
    setTimeout(startScreenProcessing, 1000);
    didShareTheScreen();
}


function startScreenProcessing() {
    const videoElement = document.querySelector('video#localVideo');
    videoElement.width = (videoElement.videoWidth * videoNormalHeight) / videoElement.videoHeight;

    const radius = 11;
    const blend = 0.5;
    const FPS = 20;
    const questionableLocationDistance = 20;
    const confidenceThresholdPercent = 0.2;

    //main image
    let src = cv.imread('imageSrc');
    let greyScaleMain = new cv.Mat();
    cv.cvtColor(src, greyScaleMain, cv.COLOR_RGBA2GRAY, 0);
    let trap2 = new cv.Mat();
    cv.bitwise_not(greyScaleMain, trap2);
    cv.GaussianBlur(trap2, trap2, new cv.Size(radius, radius), 0, 0);
    cv.addWeighted(greyScaleMain, blend, trap2, 1 - blend, 0.0, greyScaleMain);
    trap2.delete();
    src.delete();

    //video
    let cap = new cv.VideoCapture(videoElement);
    var templ = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC4);
    let greyScaleTempl = new cv.Mat();
    let trap = new cv.Mat();
    let dst = new cv.Mat();
    let color = new cv.Scalar(255, 0, 0, 255);
    let greyScaleToSearch = greyScaleMain.clone();
    var previousCorpRect = null;
    let locationPoint;
    let wasLastLocationQuestionable = true;
    function processImage() {
        let begin = Date.now();
        var t0 = performance.now(); //performance
        if (!isRunning) {
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(processImage, delay);
            return;
        }

        try {
            if (isRecordingKillByVotingScreen) {
                recordKillByVotingScreen();

                //let delay = 1000 / FPS - (Date.now() - begin);
                //setTimeout(processImage, delay);
                return;
            }


            cap.read(templ); //gets the image

            //processing of the video image
            cv.cvtColor(templ, greyScaleTempl, cv.COLOR_RGBA2GRAY, 0); //sets it to baw
            cv.bitwise_not(greyScaleTempl, trap);//inverts it
            cv.GaussianBlur(trap, trap, new cv.Size(radius, radius), 0, 0); //blurs it
            cv.addWeighted(greyScaleTempl, blend, trap, 1 - blend, 0.0, greyScaleTempl); // adds it

            if (shouldCheckForVotingScreen && getHasVotingScreen()) {
                setScreenState("votingScreen");
                if (previousCorpRect) {
                    greyScaleToSearch.delete();
                    previousCorpRect = null;
                    greyScaleToSearch = null;
                }
                getKillByVotingScreen();
            }
            else if (shouldCheckForDeathScreen && getHasDeathScreen()) {
                setScreenState("deathScreen");
            }
            else {
                if (!greyScaleToSearch)
                    greyScaleToSearch = greyScaleMain.clone();

                //matches template
                cv.matchTemplate(greyScaleToSearch, greyScaleTempl, dst, cv.TM_CCOEFF_NORMED);


                //finds and prints the found rectangle
                let result = cv.minMaxLoc(dst);
                let maxPoint = result.maxLoc;
                let factor = result.maxVal - result.minVal;
                //cv.rectangle(dst,);

                cv.rectangle(dst, maxPoint, maxPoint, new cv.Scalar(result.minVal), 10, cv.LINE_8, 0);
                let secondResult = cv.minMaxLoc(dst);

                let isConfident = true;
                if (secondResult.maxVal > result.maxVal - confidenceThresholdPercent * result.maxVal) {
                    isConfident = false;
                }

                let toAddx = 0;
                let toAddy = 0;
                if (previousCorpRect) {
                    toAddx = previousCorpRect.x;
                    toAddy = previousCorpRect.y;
                }

                //just to prevent that one false positive influence the position (at least 2 are nedded)
                if (!isConfident) {
                    wasLastLocationQuestionable = false;
                } else if (!wasLastLocationQuestionable &&
                    //isConfident &&
                    locationPoint != null &&
                    distance(globalLocationPoint[0], globalLocationPoint[1], maxPoint.x + (templ.cols / 2) + toAddx, maxPoint.y + (templ.rows / 2) + toAddy) > questionableLocationDistance) {
                    wasLastLocationQuestionable = true;
                    isConfident = false;
                    //console.log("very fast movement detected");
                } else if (//isConfident &&
                    wasLastLocationQuestionable) {
                    wasLastLocationQuestionable = true;
                }

                var toDelete;
                var toDelete2;
                if (isDebuggingImageProcessing) {
                    toDelete = new cv.Mat(dst.rows, dst.cols, cv.CV_32FC1, new cv.Scalar(-result.minVal));
                    cv.add(dst, toDelete, dst);
                    toDelete2 = new cv.Mat(dst.rows, dst.cols, cv.CV_32FC1, new cv.Scalar(factor));
                    cv.divide(dst, toDelete2, dst);
                }

                if (isConfident) {
                    locationPoint = new cv.Point(maxPoint.x + (templ.cols / 2), maxPoint.y + (templ.rows / 2));
                    globalLocationPoint = [locationPoint.x + toAddx, locationPoint.y + toAddy];
                }

                if (isDebuggingImageProcessing) {
                    if (locationPoint)
                        cv.rectangle(greyScaleToSearch, locationPoint, locationPoint, color, 2, cv.LINE_8, 0);
                    const greyScaleAllPlayers = greyScaleMain.clone();
                    for (const player of onlineUsers) {
                        if (player.position[0] >= 0 && player.position[1] >= 0) {
                            let playerLocation = new cv.Point(player.position[0], player.position[1]);
                            cv.rectangle(greyScaleAllPlayers, playerLocation, playerLocation, color, 2, cv.LINE_8, 0);
                        }
                    }

                    cv.imshow('canvasOutput', greyScaleTempl);
                    cv.imshow('canvasTestOutput', greyScaleToSearch);
                    cv.imshow('canvasTest2Output', dst);
                    cv.imshow('canvasCompleateBoard', greyScaleAllPlayers);
                    greyScaleToSearch.delete();
                    greyScaleAllPlayers.delete();
                }

                if (toDelete)
                    toDelete.delete();
                if (toDelete2)
                    toDelete2.delete();


                if (!isDebuggingImageProcessing && previousCorpRect)
                    greyScaleToSearch.delete();

                if (isConfident) {
                    setScreenState("inGame");
                    let px1 = Math.max(0, toAddx + locationPoint.x - 1 * templ.cols);
                    let py1 = Math.max(0, toAddy + locationPoint.y - 1 * templ.rows);
                    let px2 = Math.min(greyScaleMain.cols - px1, 2 * templ.cols);
                    let py2 = Math.min(greyScaleMain.rows - py1, 2 * templ.rows);

                    previousCorpRect = new cv.Rect(
                        px1,
                        py1,
                        px2,
                        py2);

                    if (isDebuggingImageProcessing) {
                        let greyScaleToSearchRoi = greyScaleMain.roi(previousCorpRect);
                        greyScaleToSearch = greyScaleToSearchRoi.clone();
                        greyScaleToSearchRoi.delete();
                    } else {
                        greyScaleToSearch = greyScaleMain.roi(previousCorpRect);
                    }
                } else {
                    setScreenState("inGameUnkown");
                    if (locationPoint) {
                        locationPoint.x += toAddx;
                        locationPoint.y += toAddy;
                    }
                    if (isDebuggingImageProcessing) {
                        greyScaleToSearch = greyScaleMain.clone();
                    } else {
                        greyScaleToSearch = greyScaleMain;
                    }
                    previousCorpRect = null;
                }
            }
        } catch (err) {
            console.log(err);
        }
        if (isDebuggingImageProcessing) {
            $("#imageProcessingTime").text((performance.now() - t0).toFixed(0));
        }

        //console.log("Call to matchTemplate took " + (performance.now() - t0) + " milliseconds.");
        let delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processImage, delay);
    }
    setTimeout(processImage, 0);

    //////////////////////////////
    //////////////////////////////
    //Deth Screen
    //////////////////////////////
    //////////////////////////////
    let deathSrc = cv.imread('imageDeathScreen');
    let deathSrcCorped = deathSrc.roi(new cv.Rect((deathSrc.cols - videoElement.width) / 2, 0, videoElement.width, deathSrc.rows));
    let greyScaleDeathSrc = new cv.Mat();
    cv.cvtColor(deathSrcCorped, greyScaleDeathSrc, cv.COLOR_RGBA2GRAY, 0);
    let trap3 = new cv.Mat();
    cv.bitwise_not(greyScaleDeathSrc, trap3);
    cv.GaussianBlur(trap3, trap3, new cv.Size(radius, radius), 0, 0);
    cv.addWeighted(greyScaleDeathSrc, blend, trap3, 1 - blend, 0.0, greyScaleDeathSrc);
    trap3.delete();
    deathSrc.delete();
    deathSrcCorped.delete();
    let deathDst = new cv.Mat();
    function getHasDeathScreen() {
        cv.matchTemplate(greyScaleDeathSrc, greyScaleTempl, deathDst, cv.TM_CCOEFF_NORMED);

        let result = cv.minMaxLoc(deathDst);
        if (result.maxVal > 0.15)
            return true;
        else
            return false;
    }


    //////////////////////////////
    //////////////////////////////
    //Voting Screen
    //////////////////////////////
    //////////////////////////////
    let votingSrc = cv.imread('imageVotingScreen');
    let greyScaleVotingSrc = new cv.Mat();
    cv.cvtColor(votingSrc, greyScaleVotingSrc, cv.COLOR_RGBA2GRAY, 0);
    let trap4 = new cv.Mat();
    cv.bitwise_not(greyScaleVotingSrc, trap4);
    cv.GaussianBlur(trap4, trap4, new cv.Size(radius, radius), 0, 0);
    cv.addWeighted(greyScaleVotingSrc, blend, trap4, 1 - blend, 0.0, greyScaleVotingSrc);
    trap4.delete();
    votingSrc.delete();
    let votinghDst = new cv.Mat();
    let corpVotingRect = new cv.Rect((videoElement.width - greyScaleVotingSrc.cols) / 2, 0, greyScaleVotingSrc.cols, greyScaleVotingSrc.rows);
    function getHasVotingScreen() {
        let corpedRoiScreen = greyScaleTempl.roi(corpVotingRect);
        cv.matchTemplate(greyScaleVotingSrc, corpedRoiScreen, votinghDst, cv.TM_CCOEFF_NORMED);
        corpedRoiScreen.delete();
        let result = cv.minMaxLoc(votinghDst);
        if (result.maxVal == 1) //sometimes this happens... Don't know why
            return false;
        if (result.maxVal > 0.15) {
            console.log("did screen vote: " + result.maxVal);
            return true;
        }
        return false;
    }


    //////////////////////////////
    //////////////////////////////
    // Kill by Voting Screen
    //////////////////////////////
    //////////////////////////////
    //i have to increase the video, make a copy and resize it back to small. When rhe voting ends this screen will be analyzed to check how was killed.
    let bigScreenWidth = (videoElement.videoWidth * videoTextAnalysisHeight) / videoElement.videoHeight;
    let killByVotingScreen = new cv.Mat(videoTextAnalysisHeight, bigScreenWidth, cv.CV_8UC4);
    let capBig;
    let lastRecordedKillByVotingScreen = null;
    let killByVotingScreenGreyScale = new cv.Mat();
    let trap5 = new cv.Mat();
    let voteImage = cv.imread('imageVote');
    let greyScaleVoteImage = new cv.Mat();
    cv.cvtColor(voteImage, greyScaleVoteImage, cv.COLOR_RGBA2GRAY, 0);
    let trap6 = new cv.Mat();
    cv.bitwise_not(greyScaleVoteImage, trap6);
    cv.GaussianBlur(trap6, trap6, new cv.Size(radius, radius), 0, 0);
    cv.addWeighted(greyScaleVoteImage, blend, trap6, 1 - blend, 0.0, greyScaleVoteImage);
    trap6.delete();
    voteImage.delete();
    let voteDst = new cv.Mat();
    function getKillByVotingScreen() {
        if (lastRecordedKillByVotingScreen && Date.now() - lastRecordedKillByVotingScreen < 1000) { // only does this every second
            return;
        }

        isRecordingKillByVotingScreen = true;

        videoElement.height = videoTextAnalysisHeight;
        videoElement.width = bigScreenWidth;
    }

    function recordKillByVotingScreen() {
        isRecordingKillByVotingScreen = false;
        if (!capBig)
            capBig = new cv.VideoCapture(videoElement);
        capBig.read(killByVotingScreen); //gets the image

        lastRecordedKillByVotingScreen = Date.now();
        verifyKillByVotingScreen();

        //videoElement.height = videoNormalHeight;
        //videoElement.width = (videoElement.videoWidth * videoNormalHeight) / videoElement.videoHeight;
    }


    const voteWidth = 25;
    const voteHeight = 20;
    function verifyKillByVotingScreen() {
        let t0 = performance.now();
        cv.cvtColor(killByVotingScreen, killByVotingScreenGreyScale, cv.COLOR_RGBA2GRAY, 0);

        cv.bitwise_not(killByVotingScreenGreyScale, trap5);
        cv.GaussianBlur(trap5, trap5, new cv.Size(radius, radius), 0, 0);
        cv.addWeighted(killByVotingScreenGreyScale, blend, trap5, 1 - blend, 0.0, killByVotingScreenGreyScale);

        //player disposition:
        // 0 5
        // 1 6
        // 2 7
        // 3 8
        // 4 9
        //skipped
        var votes = [
            0,//0
            0,//1
            0,//2
            0,//3
            0,//4
            0,//5
            0,//6
            0,//7
            0,//8
            0,//9
            0,//skipped
        ];

        let RedColor = new cv.Scalar(255, 0, 0, 255);

        let initialX = 183;
        let initialY = 125;
        const rowHeight = 63.5;
        const columnWidth = 304;
        for (let column = 0; column < 2; column++) {
            let initialXPlayer = initialX + column * columnWidth;
            for (let row = 0; row < 5; row++) {
                let initialYPlayer = initialY + row * rowHeight;
                for (let i = 1; i < 7; i++) {
                    //let voteStartLocation = new cv.Point(initialXPlayer + voteWidth * (i - 1), initialYPlayer);
                    //let voteEndLocation = new cv.Point(initialXPlayer + voteWidth * i, initialYPlayer + voteHeight);
                    let corpPlayerVote = new cv.Rect(
                        initialXPlayer + voteWidth * (i - 1),
                        initialYPlayer,
                        voteWidth,
                        voteHeight);
                    let playerVoteImage = killByVotingScreenGreyScale.roi(corpPlayerVote);

                    cv.matchTemplate(greyScaleVoteImage, playerVoteImage, voteDst, cv.TM_CCOEFF_NORMED);
                    playerVoteImage.delete();
                    //cv.rectangle(killByVotingScreenGreyScale, voteStartLocation, voteEndLocation, RedColor, 1, cv.LINE_8, 0);
                    console.log("(" + column + ", " + row + ", " + i + ") = " + voteDst.data32F[0]);

                    if (voteDst.data32F[0] > 0.4 && voteDst.data32F[0] != 1) {
                        votes[column * 5 + row] += 1;
                        //console.log("(" + column + ", " + row + ", " + i + ") = " + voteDst.data32F[0]);
                    } else {
                        break;
                    }
                }
            }
        }
        console.log("kill by voting performance: " + (performance.now() - t0));

        let skippedInitialX = 191;
        let skippedinitialY = 432;
        for (let i = 1; i < 10; i++) {
            //let voteStartLocation = new cv.Point(skippedInitialX + voteWidth * (i - 1), skippedinitialY);
            //let voteEndLocation = new cv.Point(skippedInitialX + voteWidth * i, skippedinitialY + voteHeight);

            let corpPlayerVote = new cv.Rect(
                skippedInitialX + voteWidth * (i - 1),
                skippedinitialY,
                voteWidth,
                voteHeight);
            let playerVoteImage = killByVotingScreenGreyScale.roi(corpPlayerVote);
            cv.matchTemplate(greyScaleVoteImage, playerVoteImage, voteDst, cv.TM_CCOEFF_NORMED);
            playerVoteImage.delete();
            console.log("(skipped, " + i + ") = " + voteDst.data32F[0]);
            //cv.rectangle(killByVotingScreenGreyScale, voteStartLocation, voteEndLocation, RedColor, 1, cv.LINE_8, 0);
            if (voteDst.data32F[0] > 0.4 && voteDst.data32F[0] != 1) {
                votes[10] += 1;
            } else {
                break;
            }
            //cv.rectangle(killByVotingScreenGreyScale, voteStartLocation, voteEndLocation, RedColor, 1, cv.LINE_8, 0);
        }

        var biggestIndex = 0;
        var isTied = false;
        for (let i = 1; i < votes.length; i++) {
            const numerOfVotes = votes[i];
            if (numerOfVotes > votes[biggestIndex]) {
                biggestIndex = i;
                isTied = false
            } else if (numerOfVotes == votes[biggestIndex]) {
                isTied = true;
            }
        }
        console.log(votes);
        console.log("Is tied? " + isTied);
        console.log("The most voted has " + votes[biggestIndex] + " votes in index " + biggestIndex);

        //cv.imshow('canvasCompleateBoard', killByVotingScreenGreyScale);
    }

    //////////////////////////////
    //////////////////////////////
    //Utils
    //////////////////////////////
    //////////////////////////////
    function sendPosition() {
        let begin = Date.now();
        try {
            sendMessageToAll("p", globalLocationPoint);
        } catch (exc) {
            console.log("error sending position: " + exc);
        }
        let delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(sendPosition, delay);
    }
    setTimeout(sendPosition, 0);
}

function distance(x1, y1, x2, y2) {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt(a * a + b * b);
}

////////////just debug functions///////////
function setPositionToInitial() {
    globalLocationPoint = [290, 91];
    sendMessageToAll("setPos", [290, 91]);
}

function startProcessing() {
    isRunning = true;
    sendMessageToAll("isRunning", true);
}

function stopProcessing() {
    isRunning = false;
    sendMessageToAll("isRunning", false);
}