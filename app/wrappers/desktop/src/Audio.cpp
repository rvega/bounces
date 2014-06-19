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

RtAudio::DeviceInfo DBM::Audio::chooseDevice(int outputChannels){
   // First, let's see if default device has enough channels.
   RtAudio::DeviceInfo defaultDevice = rtaudio.getDeviceInfo( rtaudio.getDefaultOutputDevice() );
   if(outputChannels <= defaultDevice.outputChannels){
      return defaultDevice;
   }

   // Now let's look at all the devices across all apis. 
         RtAudio::DeviceInfo asioDevice;
         RtAudio::DeviceInfo dsDevice;
         RtAudio asio(RtAudio::WINDOWS_ASIO);
         RtAudio ds(RtAudio::WINDOWS_DS);
         RtAudio core(RtAudio::MACOSX_CORE);


   std::vector<RtAudio::Api> apis;
   RtAudio::getCompiledApi(apis);
   for (unsigned int i=0; i<apis.size(); i++){
      if(apis.at(i) == RtAudio::MACOSX_CORE){
         // In MacOS, use default no matter what.
         return defaultDevice;
      }

      // In Aindows, prefer ASIO over DS, default to defaultDevice.
      else if(apis.at(i) == RtAudio::WINDOWS_DS){
                  std::cout << "DS" << std::endl;

         unsigned int devices = ds.getDeviceCount();
                  std::cout << devices << std::endl;

         for(unsigned int i=0; i<devices; i++){
            if (ds.getDeviceInfo(i).probed == true) {
                                 std::cout << i << std::endl;

               if(ds.getDeviceInfo(i).outputChannels >= outputChannels){
                                    std::cout << "BOOM" << std::endl;

                  dsDevice = ds.getDeviceInfo(i);
                  break;
               }
            }
         }
      }
      else if(apis.at(i) == RtAudio::WINDOWS_ASIO){
         std::cout << "A" << std::endl;

         unsigned int devices = asio.getDeviceCount();
         for(unsigned int i=0; i<devices; i++){
            if (asio.getDeviceInfo(i).probed == true) {
               std::cout << "B" << std::endl;
               if(asio.getDeviceInfo(i).outputChannels >= outputChannels){
                  asioDevice = asio.getDeviceInfo(i);
                  break;
               }
            }
         }
      }
   }

   if(asioDevice.probed){
               std::cout << "D" << std::endl;

      rtaudio = asio;
      return asioDevice;
   }
   if(dsDevice.probed){
               std::cout << "E" << std::endl;

      rtaudio = ds;
      return dsDevice;
   }

         std::cout << "C" << std::endl;

   return defaultDevice;
}

int DBM::Audio::start(int requestedSampleRate, int numberChannels, bool inputEnabled){
   RtAudio::DeviceInfo device = chooseDevice(numberChannels);
   std::cout << "device = " << device.name;

/*
    // Determine the number of devices available
   unsigned int devices = rtaudio.getDeviceCount();
   // Scan through devices for various capabilities
   RtAudio::DeviceInfo info;
   for ( unsigned int i=0; i<devices; i++ ) {
      info = rtaudio.getDeviceInfo( i );
      if ( info.probed == true ) {
         // Print, for example, the maximum number of output channels for each device
         std::cout << "device = " << info.name;
         std::cout << ": maximum output channels = " << info.outputChannels << "\n";
      }
   }


   return 0;



   // Get info for default audio device.
   RtAudio::DeviceInfo device = rtaudio.getDeviceInfo( rtaudio.getDefaultOutputDevice() );
   


   if ( rtaudio.getDeviceCount() == 0 ) return(0);

   if(numberChannels > device.outputChannels){
      // Try to find another device with enough channels.



      numberChannels = device.outputChannels; 
   }



   // Choose the sample rate closer to the requested
   std::vector<unsigned int> sampleRates = device.sampleRates;
   int diff = INT_MAX;
   int sampleRate = INT_MAX;
   for(size_t i=0; i<sampleRates.size(); i++){
      if( abs(sampleRates.at(i) - requestedSampleRate) < diff){
         diff = abs(sampleRates.at(i) - requestedSampleRate);
         sampleRate = sampleRates.at(i);
      }
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

   //int i = rtaudio.getDefaultOutputDevice();
   //RtAudio::DeviceInfo info = rtaudio.getDeviceInfo(i);
   //std::cout << info.name << std::endl;
   //std::cout << info.outputChannels << std::endl;


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
*/

   return 1;
}

int DBM::Audio::stop(){
   if(rtaudio.isStreamRunning()) rtaudio.stopStream();
   if(rtaudio.isStreamOpen()) rtaudio.closeStream();
   if(puredata.isInited()) puredata.clear();
   return 1;
};
