#pragma once

#include <RtAudio.h>
#include <PdBase.hpp>

namespace DBM{
   class Audio{
      public:
         static pd::PdBase puredata;

         explicit Audio();
         virtual ~Audio();

         int openPatch(std::string file, std::string path);
         int start(int sampleRate, int numberChannels, bool inputEnabled);
         int stop();
         unsigned int getSampleRate();

      protected: 
         RtAudio::DeviceInfo chooseDevice(int outputChannels);
         unsigned int sampleRate;
         unsigned int blockSize;
         RtAudio rtaudio;
   };
};
