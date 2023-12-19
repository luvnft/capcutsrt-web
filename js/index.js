// const fs = require('fs');
// import * as fs from "fs"

//this extracts data from a json file
function extractData(filename) {
    const data = fs.readFileSync(filename);
    console.log(data)
    return JSON.parse(data);
}
function msToSrt(timeInMs) {
    const convertMs = Math.floor(timeInMs / 1000)

    const ms = convertMs % 1000
    const totalSeconds = (convertMs - ms) / (1000)
    const seconds = (totalSeconds) % (60)
    const totalMinutes = (totalSeconds - seconds) / 60
    const minutes = totalMinutes % 60
    const hour = (totalMinutes - minutes) / 60
    return `${hour < 10 ? '0' + hour : hour}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds},${ms}`
}

var draftFileName = ''
const generateData = (file) => {
    try {
        const data = JSON.parse(file);

        const { materials, tracks } = data;

        let subTrackNumber = 1
        let subTiming = tracks[subTrackNumber].segments
        var subtitlesInfo = materials.texts.map(i => {
            let content = i.content.replace(/\<.*?\>/g, '').replace(/\<\/.*?\>/g, '').replace(/\[|\]/g, '')
            return {
                content,
                id: i.id
            }
        })

        subtitlesInfo = subtitlesInfo.map((s, i) => {
            let segment = subTiming.find(i => i.material_id === s.id)
            while (!segment) {
                subTrackNumber++
                subTiming = tracks[subTrackNumber].segments
                segment = subTiming.find(i => i.material_id === s.id)
            }
            s.start = segment.target_timerange.start
            s.end = s.start + segment.target_timerange.duration
            s.srtStart = msToSrt(s.start)
            s.srtEnd = msToSrt(s.end)
            s.subNumber = i + 1
            s.srtTiming = s.srtStart + ' --> ' + s.srtEnd

            return s
        })

        return convertData(subtitlesInfo, materials.videos[0].material_name)
    } catch (e) {
        return {
            success: false
        }
    }
}

const findBetween = (text, separator1, separator2) => {
    // Cari posisi awal separator1
    var posisiSeparator1 = text.indexOf(separator1);

    // Jika separator1 tidak ditemukan, kembalikan string kosong
    if (posisiSeparator1 === -1) {
        return "";
    }

    // Potong string dari posisi setelah separator1
    var potongan1 = text.substring(posisiSeparator1 + separator1.length);

    // Cari posisi separator2 di potongan1
    var posisiSeparator2 = potongan1.indexOf(separator2);

    // Jika separator2 tidak ditemukan, kembalikan string kosong
    if (posisiSeparator2 === -1) {
        return "";
    }

    // Potong string hingga posisi separator2 di potongan1
    var hasil = potongan1.substring(0, posisiSeparator2);

    return hasil;
}


const convertData = (subtitlesInfo, filename) => {
    // console.log(subtitlesInfo)
    const srtOut = subtitlesInfo.reduce((srt, i) => {
        let check = findBetween(i.content, '"text":"', '"}')
        i.content = check.length > 0 ? check : i.content
        const subtitle = `${i.subNumber}\n${i.srtTiming}\n${i.content}\n\n`
        return srt + subtitle
    }, '')
    const copyOut = subtitlesInfo.reduce((srt, i) => {
        const subtitle = `${i.content}\n`
        return srt + subtitle
    }, '')

    return {
        success: true,
        srtOut: srtOut,
        copyOut: copyOut,
        filename: filename
    }
}
//this function writes the string to a file
function writeToFile(data, filename) {
    console.log('Saving subtitles to file...')
    fs.writeFileSync(filename, data);
    console.log('Done!')
    // fs.writeFileSync('subtitles.json', JSON.stringify(subtitlesInfo));
}

function replaceSpacesWithNewline(text) {
    // Gantikan spasi dengan karakter baris baru
    const newText = text.replace(/\s+/g, '\n');
    return newText;
}

function textToSRT(text) {
    // Pisahkan teks menjadi baris
    const lines = text.split('\n');

    // Waktu awal
    let currentTime = 0;

    // Nomor urut subtitle
    let subtitleNumber = 1;

    // Hasil SRT
    let srtResult = '';

    // Loop melalui setiap baris teks
    for (const line of lines) {
        // Jika baris bukan baris kosong
        if (line.trim() !== '') {
            // Tambahkan nomor urut
            srtResult += subtitleNumber + '\n';

            // Waktu mulai (format SRT)
            srtResult += formatTime(currentTime) + ' --> ';

            // Hitung waktu selesai (diasumsikan 3 detik untuk setiap subtitle)
            currentTime += 3;
            srtResult += formatTime(currentTime) + '\n';

            // Tambahkan teks subtitle
            srtResult += line.trim() + '\n\n';

            // Tambahkan satu ke nomor urut subtitle
            subtitleNumber++;
        }
    }

    return srtResult;
}

// Fungsi untuk memformat waktu dalam format SRT
function formatTime(seconds) {
    const date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

function onReaderLoad(event) {
    $('#jsonPreview').val(event.target.result)
}

$('#jsonFile').on('change', function (event) {
    $('#jsonPreview').val('')
    let value = $(this)[0].files[0]
    if (value != undefined) {
        let filename = value.name
        let type = value.type
        if (type != 'application/json') {
            alert("Must be upload JSON file")
            return false
        }

        var reader = new FileReader();
        reader.onload = onReaderLoad;
        reader.readAsText(event.target.files[0]);
    }
})

$('.btn-generate').on('click', function () {

    if ($('#jsonPreview').val() == '') {
        alert("Please Upload File")
        return
    }
    let data = generateData($('#jsonPreview').val())

    if (!data.success) {
        alert("Invalid file")
        return
    }
    $('#filename').val(data.filename.split('.')[0])
    $('#resultPreview').val(data.srtOut)
})

$('.btn-replace').on('click', function () {
    let resultPreview = $('#resultPreview').val()

    if (resultPreview == '') {
        alert("Please Generate File")
        return
    }

    let from = $('input[name=from_replace]').val()
    let to = $('input[name=to_replace]').val()

    if (from == '' || to == '') {
        alert("Please Fill Replacement Input")
        return
    }
    $('#resultPreview').val(resultPreview.replaceAll(from, to))
})

const saveTxt = (value) => {
    var anchor = document.createElement('a');

    let filename = $('#filename').val()
    let format = $('input[name=file_layout]:checked').val()
    let result = value
    // if (format == 'srt') {
    //     result = textToSRT(replaceSpacesWithNewline(result))
    // }
    anchor.href = 'data:text/plain;charset=utf-8,' + result;
    anchor.download = `${filename}.${format}`;

    anchor.click()
    anchor.remove()
}

$('.btn-save').on('click', function () {
    let resultPreview = $('#resultPreview').val()

    if (resultPreview == '') {
        alert("Please Generate File")
        return
    }
    saveTxt(resultPreview)
})