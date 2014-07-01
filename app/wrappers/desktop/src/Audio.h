#pragma once

#include <RtAudio.h>
#include <PdBase.hpp>
#include <QVariant>

namespace DBM{
   class Audio{
      public:
         static pd::PdBase puredata;

         explicit Audio();
         virtual ~Audio();

         static QVariantMap getDefaultOutputDevice();
         static QVariantMap getDevices();

         int start(QString inputDevice, int inputChannels, QString outputDevice, int outputChannels, int sampleRate);
         int stop();

         unsigned int getBlockSize();
         unsigned int getSampleRate();
         unsigned int getInputChannels();
         unsigned int getOutputChannels();

         bool sixtyFourDivisible;
         unsigned int ticks;

      protected: 
         unsigned int blockSize;
         unsigned int sampleRate;
         unsigned int inputChannels;
         unsigned int outputChannels;
         RtAudio* rtaudio;
   };
};
