const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const fetch = require('node-fetch');
const s3UploadStream = require('s3-upload-stream');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

const {
  accessKeyId,
  secretAccessKey,
  region,
  bucket
} = process.env;
const Bucket = bucket;


const S3 = new AWS.S3({
  accessKeyId,
  secretAccessKey,
  region,
  bucket
})

const uploadStreamer = s3UploadStream(S3);

app.post('/transcode', async ( req, res ) => {
  const { Location } = req.body

  console.log(`incoming Location: ${Location}`);

  const data = await fetch(Location)
  const parts = Location.split('/');
  const Key = `${parts[parts.length-1].split('.')[0]}.mp3`;

  const uploadStream = uploadStreamer.upload({
    Bucket, Key
  });

  uploadStream
    .on('error', error => console.log({error}))
    .on('part', details => console.log({details}))
    .on('uploaded', data => {
      const { Location } = data;
      res.send({ Location })
    });

  ffmpeg(data.body)
    .on('start', (commandLine) => {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('end', () => {
      console.log(`finished converting ${Location}`);
    })
    .audioCodec('libmp3lame')
    .audioBitrate(128)
    .format('mp3')
    .stream(uploadStream, { end: true });

})

app.listen(3000);
