#include <climits>
#include <QApplication>

#include "Audio.h"

// Instantiate the static property puredata of type PdBase
pd::PdBase DBM::Audio::puredata;

// Buffers used for re-buffering when non 63 divisible buffer sizes
float pdOutputBuffer[51200];
float extraSamples[51200];
int extraSamplesCount = 0;

int audioCallback(void *outputBuffer, void *inputBuffer, unsigned int nBufferFrames, double streamTime, RtAudioStreamStatus status, void *data){
   (void)streamTime;

   if (status!=0) {
      std::cerr << "Stream over/underflow detected." << std::endl;
   }

   DBM::Audio* audio = (DBM::Audio*)data;
   float* out = (float*)outputBuffer;
   float* in = (float*)inputBuffer;

   if(!DBM::Audio::puredata.isInited()){
      int samples = audio->getOutputChannels() * nBufferFrames;
      for(int i=0; i<samples; ++i){
         out[i] = 0;   
      }

      return 0;
   }

   if(audio->sixtyFourDivisible){
      DBM::Audio::puredata.processFloat(audio->ticks, in, out);
   }
   else{
      // If buffer size is not divisible by 64, we process a number of ticks (64 samples)
      // larger than needed, store the extra samples in extraSamples and stitch
      // together the out buffer using extraSamples and pdOutputBuffer
      size_t sizeOfFloat = sizeof(float);
      int channels = audio->getOutputChannels();

      // Calculate new samples:
      int neededSamples = nBufferFrames - extraSamplesCount;
      int neededTicks = ceil((float)neededSamples / 64.0);
      DBM::Audio::puredata.processFloat(neededTicks, in, pdOutputBuffer);

      // Stitch old extraSamples and new pdOutputBuffer into out
      memcpy(out, extraSamples, extraSamplesCount*sizeOfFloat*channels);
      memcpy(out+(extraSamplesCount*channels), pdOutputBuffer, neededSamples*sizeOfFloat*channels);

      // Store extra samples for next callback
      int size = neededTicks*64 - neededSamples;
      int offset = neededSamples;
      memcpy(extraSamples, pdOutputBuffer+(offset*channels), size*sizeOfFloat*channels);
      extraSamplesCount = size;
   }

   return 0;
}


DBM::Audio::Audio(){
   rtaudio = NULL;
}

DBM::Audio::~Audio(){
   this->stop();
}

unsigned int DBM::Audio::getInputChannels(){
   return this->inputChannels;
}

unsigned int DBM::Audio::getOutputChannels(){
   return this->outputChannels;
}

unsigned int DBM::Audio::getBlockSize(){
   return this->blockSize;
}

unsigned int DBM::Audio::getSampleRate(){
   return this->sampleRate;
}

QVariantMap DBM::Audio::getDefaultOutputDevice(){
   RtAudio rta;
   int deviceId =  rta.getDefaultOutputDevice();
   RtAudio::DeviceInfo info = rta.getDeviceInfo(deviceId);

   RtAudio::Api api = rta.getCurrentApi(); 
   QString apiName;
   if(api == RtAudio::MACOSX_CORE){
      apiName="CORE";
   }
   if(api == RtAudio::WINDOWS_DS){
      apiName="DS";
   }
   if(api == RtAudio::WINDOWS_ASIO){
      apiName="ASIO";
   }
   if(api == RtAudio::WINDOWS_WASAPI){
      apiName="WASAPI";
   }

   QVariantMap deviceInfo;
   deviceInfo["id"] = QVariant(deviceId);
   deviceInfo["name"] = QVariant(QString::fromStdString(info.name));
   deviceInfo["outputChannels"] = QVariant(info.outputChannels);
   deviceInfo["inputChannels"] = QVariant(info.inputChannels);
   deviceInfo["api"] = QVariant(apiName);

   QVariantList sampleRates;
   for(int j=0; j<info.sampleRates.size(); j++){
      sampleRates.insert(j, info.sampleRates.at(j));
   }
   deviceInfo["sampleRates"] = sampleRates;

   return deviceInfo;
}

QVariantMap DBM::Audio::getDevices(){
   QVariantMap result;
   RtAudio* rta;
   std::vector<RtAudio::Api> apis;
   RtAudio::getCompiledApi(apis);
   QString apiName;
   QVariantList devices;
   int k=0;
   for (unsigned int i=0; i<apis.size(); i++){
      if(apis.at(i) == RtAudio::MACOSX_CORE){
         apiName="CORE";
         rta = new RtAudio(RtAudio::MACOSX_CORE);
      }
      if(apis.at(i) == RtAudio::WINDOWS_DS){
         rta = new RtAudio(RtAudio::WINDOWS_DS);
         apiName="DS";
      }
      if(apis.at(i) == RtAudio::WINDOWS_ASIO){
         rta = new RtAudio(RtAudio::WINDOWS_ASIO);
         apiName="ASIO";
      }
      if(apis.at(i) == RtAudio::WINDOWS_WASAPI){
         rta = new RtAudio(RtAudio::WINDOWS_WASAPI);
         apiName="WASAPI";
      }
   
      for(int i=0; i<rta->getDeviceCount(); i++){
         RtAudio::DeviceInfo info = rta->getDeviceInfo(i);
         if(info.probed){
            QVariantMap deviceInfo;
            deviceInfo["id"] = QVariant(i);
            deviceInfo["name"] = QVariant(QString::fromStdString(info.name));
            deviceInfo["outputChannels"] = QVariant(info.outputChannels);
            deviceInfo["inputChannels"] = QVariant(info.inputChannels);
            deviceInfo["api"] = QVariant(apiName);

            QVariantList sampleRates;
            for(int j=0; j<info.sampleRates.size(); j++){
               sampleRates.insert(j, info.sampleRates.at(j));
            }
            deviceInfo["sampleRates"] = sampleRates;

            devices.insert(k, deviceInfo);
         }
         k++;
      }
      delete rta;
   }

   result["devices"] = devices;
   return result;
}

// TODO: init input
int DBM::Audio::start(QString inputDevice, int inputChannels, QString outputDevice, int outputChannels, int sampleRate){
   this->inputChannels = 0;

   int deviceId;
   RtAudio::DeviceInfo outputDeviceInfo;
   if(outputDevice == "default"){
      rtaudio = new RtAudio();

      deviceId = rtaudio->getDefaultOutputDevice();
      outputDeviceInfo = rtaudio->getDeviceInfo(deviceId);
      if(!outputDeviceInfo.probed){
         return 1; 
      }
   }
   else{
      QString api = outputDevice.split(":")[0];
      QString deviceIdStr = outputDevice.split(":")[1];
      deviceId = deviceIdStr.toInt();

      if(api == "CORE"){
         rtaudio = new RtAudio(RtAudio::MACOSX_CORE);
      }
      if(api == "DS"){
         rtaudio = new RtAudio(RtAudio::WINDOWS_DS);
      }
      if(api == "ASIO"){
         rtaudio = new RtAudio(RtAudio::WINDOWS_ASIO);
      }
      if(api == "WASAPI"){
         rtaudio = new RtAudio(RtAudio::WINDOWS_WASAPI);
      }
      outputDeviceInfo = rtaudio->getDeviceInfo(deviceId);
   }

   if(outputChannels > outputDeviceInfo.outputChannels){
      this->outputChannels = outputDeviceInfo.outputChannels;
   }
   else{
      this->outputChannels = outputChannels;
   }

   // Choose the sample rate closer to the requested
   std::vector<unsigned int> sampleRates = outputDeviceInfo.sampleRates;
   int diff = INT_MAX;
   int actualSampleRate = INT_MAX;
   for(size_t i=0; i<sampleRates.size(); i++){
      if( abs(sampleRates.at(i) - sampleRate) < diff){
         diff = abs(sampleRates.at(i) - sampleRate);
         actualSampleRate = sampleRates.at(i);
      }
   }
   this->sampleRate = actualSampleRate;

   // Initialize audio
   blockSize = 512;
   RtAudio::StreamParameters outputParams;
   outputParams.deviceId = deviceId;
   outputParams.nChannels = this->outputChannels;

   RtAudio::StreamOptions options;
   // options.flags = RTAUDIO_SCHEDULE_REALTIME | RTAUDIO_MINIMIZE_LATENCY;
   options.flags = RTAUDIO_SCHEDULE_REALTIME;
   try {
      rtaudio->openStream( &outputParams, NULL, RTAUDIO_FLOAT32, this->sampleRate, &blockSize, &audioCallback, this, &options, NULL);
      sixtyFourDivisible = (blockSize%64 == 0);
      ticks = blockSize/64;
      rtaudio->startStream();
   }
   catch ( RtAudioError& e ) {
      std::cerr << '\n' << e.getMessage() << '\n' << std::endl;
      return 0;
   }
   
   return 1;
}

int DBM::Audio::stop(){
   if(rtaudio->isStreamRunning()) rtaudio->stopStream();
   if(rtaudio->isStreamOpen()) rtaudio->closeStream();
   delete rtaudio;
   rtaudio = NULL;
   return 1; 
};
