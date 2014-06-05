#include <climits>
//#include <cwchar>

#include "Audio.h"
#include "Externals.h"

// define the static property puredata of type PdBase
pd::PdBase DBM::Audio::puredata;

int audioCallback(void *outputBuffer, void *inputBuffer, unsigned int nBufferFrames, double streamTime, RtAudioStreamStatus status, void *data){

   if (status!=0) {
      std::cerr << "Stream over/underflow detected." << std::endl;
   }

   float* out = (float*)outputBuffer;
   float* in = (float*)inputBuffer;

   // Puredata processes in ticks of 64 samples
   int ticks = nBufferFrames/64;
   DBM::Audio::puredata.processFloat(ticks, in, out);

   return 0;

   (void)streamTime;
   (void)status;
   (void)data;
}


DBM::Audio::Audio(){ }

DBM::Audio::~Audio(){
   this->stop();
}


unsigned int DBM::Audio::getSampleRate(){
   return this->sampleRate;
}

int DBM::Audio::start(int sampleRate, int numberChannels, bool inputEnabled){
   if ( rtaudio.getDeviceCount() == 0 ) return(0);

   // Get info for default audio device.
   RtAudio::DeviceInfo device = rtaudio.getDeviceInfo( rtaudio.getDefaultOutputDevice() );
   
   // Choose the sample rate closer to the requested
   std::vector<unsigned int> sampleRates = device.sampleRates;
   int diff = INT_MAX;
   for(size_t i=0; i<sampleRates.size(); i++){
      if( abs(sampleRates.at(i)-sampleRate) < diff){
         sampleRate = sampleRates.at(i);
         diff = abs(sampleRate - sampleRate);
      }
   }

   // Choose number of channels closer to requested
   if(numberChannels > device.outputChannels){
      numberChannels = device.outputChannels; 
   }

   // Input channels
   int inChannels = 0;
   if(inputEnabled){
      inChannels = numberChannels;
      if(inChannels > device.inputChannels){
         inChannels = device.inputChannels; 
      }
   }

   // Init PD
   puredata.init(inChannels,numberChannels,sampleRate);
   Externals::init();

   // int i = rtaudio.getDefaultOutputDevice();
   // RtAudio::DeviceInfo info = rtaudio.getDeviceInfo(i);
   // std::cout << info.name << std::endl;

   // i = rtaudio.getDefaultInputDevice();
   // info = rtaudio.getDeviceInfo(i);
   // std::cout << info.name << std::endl;

   // Initialize audio
   blockSize = 512;
   RtAudio::StreamParameters outputParams;
   outputParams.deviceId = rtaudio.getDefaultOutputDevice();
   outputParams.nChannels = numberChannels;

   RtAudio::StreamParameters inputParams;
   inputParams.deviceId = rtaudio.getDefaultInputDevice();
   inputParams.nChannels = inChannels;

   RtAudio::StreamOptions options;
   // options.flags = RTAUDIO_SCHEDULE_REALTIME | RTAUDIO_MINIMIZE_LATENCY;
   options.flags = RTAUDIO_SCHEDULE_REALTIME;
   try {
      if(inputEnabled){
         rtaudio.openStream( &outputParams, &inputParams, RTAUDIO_FLOAT32, sampleRate, &blockSize, &audioCallback, NULL, &options, NULL);
      }
      else{
         rtaudio.openStream( &outputParams, NULL, RTAUDIO_FLOAT32, sampleRate, &blockSize, &audioCallback, NULL, &options, NULL);
      }
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
   if(puredata.isInited()) puredata.clear();
   return 1;
};
