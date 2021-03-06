#include <iostream>
#include <QWebFrame>
#include <QMap>
#include <QApplication>
#include <PdTypes.hpp>

#include "Audio.h"
#include "PdBridge.h"
#include "Externals.h"

DBM::PdBridge::PdBridge(QObject* parent) : QObject(parent){
   audio = new Audio();
   initedExternals = false;

   // timer = new QTimer(this);
   // timer->setTimerType(Qt::PreciseTimer);
   // connect(timer, SIGNAL(timeout()), this, SLOT(timerTick()));
}

DBM::PdBridge::~PdBridge(){
   delete audio;
}

void DBM::PdBridge::setPage(WebPage* page){
   this->page = page;
}

////////////////////////////////////////////////////////////////////////////////
// The following methods can be called from Javascript as members of a global
// object called QT. Ex: QT.configurePlayback(...).

///////////////////////////////////////////////////////////
// PD Engine and files
//

void DBM::PdBridge::init(int inChannels, int outChannels, int sampleRate, int callbackId){
   if(!Audio::puredata.isInited()){
      std::cout << "PD out channels:" << outChannels << std::endl;
      if(Audio::puredata.init(inChannels, outChannels, sampleRate)){
         if(!initedExternals){
            Externals::init();
            initedExternals = true;
         }
         Audio::puredata.setReceiver(this);
         // timer->start(1);

         QVariantMap params;
         fireOKCallback(callbackId, params);
         return;
      }
   }

   fireErrorCallback(callbackId+1, "Could not init PD engine");
}

void DBM::PdBridge::clear(int callbackId){
   if(Audio::puredata.isInited()){
      Audio::puredata.clear(); 
      // timer->stop();

      QVariantMap params;
      fireOKCallback(callbackId, params);
      return;
   }

   fireErrorCallback(callbackId+1, "Could not clear PD engine");
}

void DBM::PdBridge::openPatch(QString path, QString fileName, int callbackId){
   path = QApplication::applicationDirPath() + "/res/" + path;
   patch = Audio::puredata.openPatch(fileName.toStdString(), path.toStdString());
   if(!patch.isValid()) {
      fireErrorCallback(callbackId+1, "Could not open patch " + path + "/" + fileName);
      return;
   }

   QVariantMap params;
   fireOKCallback(callbackId, params);
}

void DBM::PdBridge::closePatch(int callbackId){
   Audio::puredata.closePatch(patch);

   QVariantMap params;
   fireOKCallback(callbackId, params);
}

///////////////////////////////////////////////////////////
// Audio devices
//

void DBM::PdBridge::getDefaultOutputDevice(int callbackId){
   QVariantMap device = DBM::Audio::getDefaultOutputDevice();
   emit fireOKCallback(callbackId, device);
}

void DBM::PdBridge::getAudioDevices(int callbackId){
   QVariantMap devices = DBM::Audio::getDevices();
   emit fireOKCallback(callbackId, devices);
}

void DBM::PdBridge::stopAudio(int callbackId){
   audio->stop();

   QVariantMap params;
   emit fireOKCallback(callbackId, params);
}

void DBM::PdBridge::startAudio(QString inputDevice, int inputChannels, QString outputDevice, int outputChannels, int sampleRate, bool mixingEnabled, int callbackId){
   
   if(!audio->start(inputDevice, inputChannels, outputDevice, outputChannels, sampleRate)){
      emit fireErrorCallback(callbackId+1, "Could not start audio engine.");
      return;
   }

   QVariantMap params;
   params["sampleRate"] = QVariant(audio->getSampleRate());
   params["inputChannels"] = QVariant(audio->getInputChannels());
   params["outputChannels"] = QVariant(audio->getOutputChannels());
   params["mixingEnabled"] = QVariant(mixingEnabled);
   emit fireOKCallback(callbackId, params);
}

///////////////////////////////////////////////////////////
// Send messages to PD
//

void DBM::PdBridge::setActive(bool active){
   Audio::puredata.computeAudio(active);
}

void DBM::PdBridge::sendList(QVariantList list, QString receiver){
   Audio::puredata.startMessage();

   for(int i=0; i<list.size(); i++){
      bool ok = false;   
      float val = list.at(i).toFloat(&ok);
      if(ok){
         Audio::puredata.addFloat(val);
      }
      else{
         QString str = list.at(i).toString();
         Audio::puredata.addSymbol(str.toStdString());
      }
   }

   Audio::puredata.finishList(receiver.toStdString());
}

void DBM::PdBridge::sendFloat(float num, QString receiver){
   Audio::puredata.sendFloat(receiver.toStdString(), num);
}

void DBM::PdBridge::sendBang(QString receiver){
   Audio::puredata.sendBang(receiver.toStdString());
}

void DBM::PdBridge::sendNoteOn(int channel, int pitch, int velocity){
   Audio::puredata.sendNoteOn(channel, pitch, velocity);
}

void DBM::PdBridge::bind(QString sender){
   Audio::puredata.subscribe(sender.toStdString());
}

////////////////////////////////////////////////////////////////////////////////
// The following methods are called by libpd when messages are sent from the 
// patch

void DBM::PdBridge::print(const std::string& message){
   std::cout << "PD: " << message << std::endl;
}
   
void DBM::PdBridge::receiveBang(const std::string& dest){
   emit doReceiveBang(QString::fromStdString(dest));
}

void DBM::PdBridge::receiveFloat(const std::string& dest, float num){
   emit doReceiveFloat(QString::fromStdString(dest), num);
}

void DBM::PdBridge::receiveSymbol(const std::string& dest, const std::string& symbol){
   emit doReceiveSymbol(QString::fromStdString(dest), QString::fromStdString(symbol));
}

void DBM::PdBridge::receiveList(const std::string& dest, const pd::List& list){
   std::string message = list.toString();
   emit doReceiveSymbol(QString::fromStdString(dest), QString::fromStdString(message));
}

void DBM::PdBridge::receiveMessage(const std::string& dest, const std::string& msg, const pd::List& list){
   std::cerr << "DBM::PdBridge::receiveMessage is unimplemented." << std::endl;
   (void)dest;
   (void)list;
   (void)msg;
}


////////////////////////////////////////////////////////////////////////////////
// Timer to request messages from pd (so that methods above are triggered)
// 

// void DBM::PdBridge::timerTick(){
   // Audio::puredata.receiveMessages();
// }

/*

////////////////////////////////////////////////////////////////////////
#pragma mark --
#pragma mark Javascript Visible Methods

- (void)configurePlayback:(CDVInvokedUrlCommand*)command {
  __block int sampleRate = [(NSNumber*)[command.arguments objectAtIndex:0] intValue];
  __block int numberChannels = [(NSNumber*)[command.arguments objectAtIndex:1] intValue];
  __block int inputEnabled = [(NSNumber*)[command.arguments objectAtIndex:2] boolValue];
  __block int mixingEnabled = [(NSNumber*)[command.arguments objectAtIndex:3] boolValue];
  
  [self.commandDelegate runInBackground:^{
    PdAudioStatus status = [self.audioController configurePlaybackWithSampleRate:sampleRate numberChannels:numberChannels inputEnabled:inputEnabled mixingEnabled:mixingEnabled];
    
    CDVPluginResult* pluginResult = nil;
    if(status == PdAudioOK){
      [self setupExternals];
      
      pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }
    else if(status == PdAudioPropertyChanged){
      sampleRate = [self.audioController sampleRate];
      numberChannels = [self.audioController numberChannels];
      inputEnabled = [self.audioController inputEnabled];
      mixingEnabled = [self.audioController mixingEnabled];
      NSDictionary* params = [NSDictionary dictionaryWithObjectsAndKeys:
                              [NSNumber numberWithInt:sampleRate], @"sampleRate",
                              [NSNumber numberWithInt:numberChannels], @"numberChannels",
                              [NSNumber numberWithBool:inputEnabled], @"inputEnabled",
                              [NSNumber numberWithBool:mixingEnabled], @"mixingEnabled",
                              nil];
      [self setupExternals];
      
      pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:params];
    }
    else{ // if(status == pdAudioError)
      // TODO: test this.
      NSString* msg = [NSString stringWithFormat:@"Could not configure audio playback. SampleRate:%i, NumChannels:%i, inputEnabled:%d, mixingEnabled:%d", sampleRate, numberChannels, inputEnabled, mixingEnabled];
      pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:msg];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    
    // TODO: where should I put this?
    [PdBase setDelegate:self];

    
    
//    NSString* payload = nil;
//    // Some blocking logic...
//    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:payload];
//    // The sendPluginResult method is thread-safe.
//    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];

  
}


- (void)setActive:(CDVInvokedUrlCommand*)command {
  BOOL active = [[command.arguments objectAtIndex:0] boolValue];

  [self.audioController setActive:active];

  CDVPluginResult* pluginResult = nil;
  if([self.audioController isActive]!=active){
    NSString* msg = [NSString stringWithFormat:@"Could not (de)activate audio controller. active: %d", active];
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:msg];
  }
  else{
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
  }
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)sendNoteOn:(CDVInvokedUrlCommand*)command {
  float channel = [[command.arguments objectAtIndex:0] floatValue];
  float pitch = [[command.arguments objectAtIndex:1] floatValue];
  float velocity = [[command.arguments objectAtIndex:2] floatValue];

  [PdBase sendNoteOn:channel pitch:pitch velocity:velocity];

  CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)sendFloat:(CDVInvokedUrlCommand*)command {
  float f = [[command.arguments objectAtIndex:0] floatValue];
  NSString* receiver = [command.arguments objectAtIndex:1]; 

  [PdBase sendFloat:f toReceiver:receiver];

  CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];

}

- (void)sendBang:(CDVInvokedUrlCommand*)command {
    NSString* receiver = [command.arguments objectAtIndex:0];
    
    [PdBase sendBangToReceiver:receiver];
    
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    
}

- (void)sendSymbol:(CDVInvokedUrlCommand*)command {
    NSString* value = [command.arguments objectAtIndex:0];
    NSString* receiver = [command.arguments objectAtIndex:1];
    
    [PdBase sendSymbol:value toReceiver:receiver];
    
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    
}

- (void)readArray:(CDVInvokedUrlCommand*)command {
  NSString* arrayName = (NSString*)[command.arguments objectAtIndex:0];
  __block int n = [(NSNumber*)[command.arguments objectAtIndex:1] intValue];
  __block int offset = [(NSNumber*)[command.arguments objectAtIndex:2] intValue];
    
    if(n==0){
        n = [PdBase arraySizeForArrayNamed:arrayName];
    }
    
  [self.commandDelegate runInBackground:^{
    CDVPluginResult* pluginResult = nil;
    if(n > MAX_ARRAY_SIZE) n = MAX_ARRAY_SIZE;
    if(![PdBase copyArrayNamed:arrayName withOffset:offset toArray:readArrayBuffer count:n]){
        [readArrayArray removeAllObjects];
        for(int i=0; i<n; i++){
          [readArrayArray addObject:[NSNumber numberWithFloat:readArrayBuffer[i]]];
        }
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:readArrayArray];
    }
    else{
        NSString* msg = [NSString stringWithFormat:@"Could not read array %@", arrayName];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:msg];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

- (void)showMediaPicker:(CDVInvokedUrlCommand*)command {
    MPMediaPickerController *pickerController =	[[MPMediaPickerController alloc] initWithMediaTypes: MPMediaTypeAnyAudio];
    pickerController.prompt = @"Choose an audio track";
    pickerController.allowsPickingMultipleItems = NO;
    pickerController.delegate = self;
    _currentCommand = command;
    [self.viewController presentViewController:pickerController animated:YES completion:nil];
}


// TODO: where should I put this?
// // [PdBase setDelegate:self];
- (void)receivePrint:(NSString *)message {
  NSLog(@"Pd Console: %@", message);
}


   */
