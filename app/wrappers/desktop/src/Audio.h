#pragma once

#include <RtAudio.h>
#include <PdBase.hpp>
#include <QVariant>

namespace DBM{
   class Audio{
      public:
         static pd::PdBase puredata;
         static QVariantMap getDefaultOutputDevice();
         static QVariantMap getDevices();

         explicit Audio();
         virtual ~Audio();

         int openPatch(QString path, QString file);
         int start(QString inputDevice, int inputChannels, QString outputDevice, int outputChannels, int sampleRate);
         int stop();
         unsigned int getSampleRate();
         unsigned int getInputChannels();
         unsigned int getOutputChannels();

      protected: 
         RtAudio::DeviceInfo chooseDevice(int outputChannels);
         unsigned int sampleRate;
         unsigned int inputChannels;
         unsigned int outputChannels;
         unsigned int blockSize;
         RtAudio rtaudio;
         bool firstTime;
         pd::Patch patch;
   };
};
