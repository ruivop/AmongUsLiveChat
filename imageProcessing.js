const smallFactor = 0.5;
const videoNormalHeight = 124 * smallFactor;
var globalLocationPoint = [140, 221];

var isDebuggingImageProcessing = false;
var isRunning = true;

async function startScreenCapture() {

    const mapImage = document.querySelector('#imageSrc');
    const deathSreenImage = document.querySelector('#imageDeathScreen');
    mapImage.height *= smallFactor;
    mapImage.width *= smallFactor;
    deathSreenImage.height = videoNormalHeight;

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

    //main serach image
    var radius = 11;
    var blend = 0.5;
    const FPS = 20;
    let src = cv.imread('imageSrc');
    let greyScaleMain = new cv.Mat();
    cv.cvtColor(src, greyScaleMain, cv.COLOR_RGBA2GRAY, 0);
    let trap2 = new cv.Mat();
    cv.bitwise_not(greyScaleMain, trap2);
    cv.GaussianBlur(trap2, trap2, new cv.Size(radius, radius), 0, 0);
    cv.addWeighted(greyScaleMain, blend, trap2, 1 - blend, 0.0, greyScaleMain);

    //video
    let cap = new cv.VideoCapture(videoElement);
    console.log(videoElement.width);

    var templ = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC4);
    let greyScaleTempl = new cv.Mat();
    let trap = new cv.Mat();
    let dst = new cv.Mat();
    let color = new cv.Scalar(255, 0, 0, 255);
    let greyScaleToSearch = greyScaleMain.clone();
    var previousCorpRect = null;
    let locationPoint;
    let wasLastLocationQuestionable = true;
    const questionableLocationDistance = 20;
    const confidenceThresholdPercent = 0.2;
    function processImage() {
        let begin = Date.now();
        var t0 = performance.now(); //performance
        if (!isRunning) {
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(processImage, delay);
            return;
        }

        try {
            cap.read(templ); //gets the image

            //processing of the video image
            cv.cvtColor(templ, greyScaleTempl, cv.COLOR_RGBA2GRAY, 0); //sets it to baw
            cv.bitwise_not(greyScaleTempl, trap);//inverts it
            cv.GaussianBlur(trap, trap, new cv.Size(radius, radius), 0, 0); //blurs it
            cv.addWeighted(greyScaleTempl, blend, trap, 1 - blend, 0.0, greyScaleTempl); // adds it

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
            //cv.devide();
            //let point = new cv.Point(maxPoint.x + templ.cols, maxPoint.y + templ.rows);
            if (isConfident || locationPoint == null) {
                locationPoint = new cv.Point(maxPoint.x + (templ.cols / 2), maxPoint.y + (templ.rows / 2));

                globalLocationPoint = [locationPoint.x + toAddx, locationPoint.y + toAddy];
            }
            //let greyScaleMainClone = greyScaleMain.clone();
            //cv.rectangle(greyScaleMainClone, maxPoint, point, color, 2, cv.LINE_8, 0);
            if (isDebuggingImageProcessing) {
                cv.rectangle(greyScaleToSearch, locationPoint, locationPoint, color, 2, cv.LINE_8, 0);
                const greyScaleAllPlayers = greyScaleMain.clone();
                for (const player of onlineUsers) {
                    if(player.position[0] >= 0 && player.position[1] >= 0) {
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

            if (isConfident) {
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
                    greyScaleToSearch = greyScaleMain.roi(previousCorpRect).clone();
                } else {
                    greyScaleToSearch = greyScaleMain.roi(previousCorpRect);
                }
            } else {
                locationPoint.x += toAddx;
                locationPoint.y += toAddy;
                if (isDebuggingImageProcessing) {
                    greyScaleToSearch = greyScaleMain.clone();
                } else {
                    greyScaleToSearch = greyScaleMain;
                }
                previousCorpRect = null;
            }

            //trap.delete();
        } catch (err) {
            console.log(err);
        }
        //console.log("Call to matchTemplate took " + (performance.now() - t0) + " milliseconds.");
        let delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processImage, delay);
    }
    setTimeout(processImage, 0);

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