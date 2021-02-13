const smallFactor = 0.5;
const videoNormalHeight = 124 * smallFactor;
var globalLocationPoint = [-1, -1];

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
    const confidenceThresholdPercent = 0.2;
    function processImage() {
        let begin = Date.now();
        var t0 = performance.now(); //performance
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

            cv.add(dst, new cv.Mat(dst.rows, dst.cols, cv.CV_32FC1, new cv.Scalar(-result.minVal)), dst);
            cv.divide(dst, new cv.Mat(dst.rows, dst.cols, cv.CV_32FC1, new cv.Scalar(factor)), dst);
            //cv.devide();
            //let point = new cv.Point(maxPoint.x + templ.cols, maxPoint.y + templ.rows);
            if (isConfident || locationPoint == null) {
                locationPoint = new cv.Point(maxPoint.x + (templ.cols / 2), maxPoint.y + (templ.rows / 2));

                let toAddx = 0;
                let toAddy = 0;
                if (previousCorpRect) {
                    toAddx = previousCorpRect.x;
                    toAddy = previousCorpRect.y;
                }

                globalLocationPoint = [locationPoint.x + toAddx, locationPoint.y + toAddy];
            }
            //let greyScaleMainClone = greyScaleMain.clone();
            //cv.rectangle(greyScaleMainClone, maxPoint, point, color, 2, cv.LINE_8, 0);
            cv.rectangle(greyScaleToSearch, locationPoint, locationPoint, color, 2, cv.LINE_8, 0);
            cv.imshow('canvasOutput', greyScaleTempl);
            cv.imshow('canvasTestOutput', greyScaleToSearch);
            cv.imshow('canvasTest2Output', dst);

            //console.log(result.maxVal);

            if (isConfident) {
                let relativeBeginX = 0;
                let relativeBeginY = 0;
                if (previousCorpRect) {
                    relativeBeginX = previousCorpRect.x;
                    relativeBeginY = previousCorpRect.y;
                }

                let px1 = Math.max(0, relativeBeginX + locationPoint.x - 1 * templ.cols);
                let py1 = Math.max(0, relativeBeginY + locationPoint.y - 1 * templ.rows);
                let px2 = Math.min(greyScaleMain.cols - px1, 2 * templ.cols);
                let py2 = Math.min(greyScaleMain.rows - py1, 2 * templ.rows);

                previousCorpRect = new cv.Rect(
                    px1,
                    py1,
                    px2,
                    py2);
                greyScaleToSearch = greyScaleMain.roi(previousCorpRect).clone();
            } else {
                if (previousCorpRect) {
                    locationPoint.x += previousCorpRect.x;
                    locationPoint.y += previousCorpRect.y;
                }
                greyScaleToSearch = greyScaleMain.clone();
                previousCorpRect = null;
            }
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

/*
function findXMaxLocs(dst, threshold) {
    let ret = [];
    for (let i = 0; i < dst.cols; i++) {
        for (let j = 0; j < dst.rows; j++) {
            const element = dst.data32F[i * dst.cols + j * dst.rows];
            if (element > threshold) {
                ret.push(element);
                if (ret.length > 10)
                    return ret;
            }
        }
    }
    return ret;
}*/
