#include <climits>
#include <QApplication>

#include "Audio.h"
#include "Externals.h"

// define the static property puredata of type PdBase
pd::PdBase DBM::Audio::puredata;

float buffer[2048]; // 512 block size * 4 channels

int audioCallback(void *outputBuffer, void *inputBuffer, unsigned int nBufferFrames, double streamTime, RtAudioStreamStatus status, void *data){

   if (status!=0) {
      std::cerr << "Stream over/underflow detected." << std::endl;
   }

   DBM::Audio* audio = (DBM::Audio*)data;

   float* out = (float*)outputBuffer;
   float* in = (float*)inputBuffer;

   // if(DBM::Audio::puredata.isInited()){
      // Puredata processes in ticks of 64 samples
      int ticks = nBufferFrames/64;
      DBM::Audio::puredata.processFloat(ticks, in, buffer);

      memcpy(out, buffer, audio->getOutputChannels() * sizeof(float));

   // }
   // else{
   //    int numSamples = nBufferFrames * audio->getOutputChannels();
   //    for(int i=0; i<numSamples; i++){
   //       out[i] = 0; 
   //    }
   // }

   return 0;

   (void)streamTime;
   (void)status;
   (void)data;
}


DBM::Audio::Audio(){ 
   firstTime = true;
}

DBM::Audio::~Audio(){
   this->stop();

   if(puredata.isInited()){
      puredata.clear();
   } 
}


unsigned int DBM::Audio::getInputChannels(){
   return this->inputChannels;
}

unsigned int DBM::Audio::getOutputChannels(){
   return this->outputChannels;
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
      // delete rta;
   }

   result["devices"] = devices;
   return result;
}

int DBM::Audio::openPatch(QString path, QString file){
   if(!puredata.isInited()){
      puredata.init(this->inputChannels, this->outputChannels, this->sampleRate);
      if(firstTime){
         Externals::init();
         firstTime = false;
      }
   }

   path = QApplication::applicationDirPath() + "/res/" + path;
   patch = puredata.openPatch(file.toStdString(), path.toStdString());
   if(!patch.isValid()) {
      return 0;
   }

   return 1;
}

// TODO: init input
int DBM::Audio::start(QString inputDevice, int inputChannels, QString outputDevice, int outputChannels, int sampleRate){
   this->inputChannels = 0;

   int deviceId;
   RtAudio::DeviceInfo outputDeviceInfo;
   if(outputDevice == "default"){
      deviceId = rtaudio.getDefaultOutputDevice();
   }
   else{
      QString api = outputDevice.split(":")[0];
      QString deviceIdStr = outputDevice.split(":")[1];
      deviceId = deviceIdStr.toInt();
   }

   outputDeviceInfo = rtaudio.getDeviceInfo(deviceId);
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
      rtaudio.openStream( &outputParams, NULL, RTAUDIO_FLOAT32, this->sampleRate, &blockSize, &audioCallback, this, &options, NULL);
      rtaudio.startStream();
   }
   catch ( RtAudioError& e ) {
      std::cerr << '\n' << e.getMessage() << '\n' << std::endl;
      return 0;
   }

   return 1;
}

int DBM::Audio::stop(){
   if(rtaudio.isStreamRunning()) rtaudio.stopStream();
   if(rtaudio.isStreamOpen()) rtaudio.closeStream();
   return 1;
};
