## App name
TARGET = Bounces

## Additional sources
SOURCES += app/vendors/getdir/getdir.c # getdir external
SOURCES += app/vendors/pdogg/oggread~.c # oggread~ external
SOURCES += app/vendors/zexy/src/demultiplex~.c # demultiplex~ external

# HOA Externals
win32{
   DEFINES += _WINDOWS
}
HOA = app/vendors/hoa/HoaLibrary
CICM = app/vendors/hoa/CicmWrapper
SOURCES += $$CICM/Sources/eattr/*.c
SOURCES += $$CICM/Sources/ebox/*.c
SOURCES += $$CICM/Sources/eclass/*.c
SOURCES += $$CICM/Sources/ecommon/*.c
SOURCES += $$CICM/Sources/egraphics/*.c
SOURCES += $$CICM/Sources/epopup/*.c
SOURCES += $$CICM/Sources/ewidget/*.c

SOURCES += $$HOA/PureData/hoaMap/hoa.map~.cpp
SOURCES += $$HOA/Sources/hoaAmbisonics/Ambisonic.cpp
SOURCES += $$HOA/Sources/hoaEncoder/AmbisonicEncoder.cpp
SOURCES += $$HOA/Sources/hoaMap/AmbisonicMap.cpp
SOURCES += $$HOA/Sources/hoaMap/AmbisonicMultiMaps.cpp
SOURCES += $$HOA/Sources/hoaWider/AmbisonicWider.cpp
SOURCES += $$HOA/Sources/CicmLibrary/CicmLines/CicmLine.cpp

SOURCES += $$HOA/PureData/hoaDecoder/hoa.decoder~.cpp
SOURCES += $$HOA/Sources/hoaMultiDecoder/AmbisonicsMultiDecoder.cpp
SOURCES += $$HOA/Sources/hoaRestitution/AmbisonicsRestitution.cpp
SOURCES += $$HOA/Sources/hoaBinaural/AmbisonicsBinaural.cpp
SOURCES += $$HOA/Sources/hoaDecoder/AmbisonicsDecoder.cpp

SOURCES += $$HOA/PureData/hoaFreeverb/hoa.freeverb~.cpp
SOURCES += $$HOA/Sources/hoaFreeverb/AmbisonicFreeverb.cpp
SOURCES += $$HOA/Sources/CicmLibrary/CicmReverb/CicmFreeverb.cpp
SOURCES += $$HOA/Sources/CicmLibrary/CicmFilters/CicmFilterComb.cpp
SOURCES += $$HOA/Sources/CicmLibrary/CicmFilters/CicmFilterAllPass.cpp
SOURCES += $$HOA/Sources/CicmLibrary/CicmFilters/CicmFilter.cpp

SOURCES += $$HOA/PureData/hoaOptim/hoa.optim~.cpp
SOURCES += $$HOA/Sources/hoaOptim/AmbisonicOptim.cpp

# vorbis library
vorbis_dir = app/vendors/libvorbis
vorbis_install_dir = /usr/local/lib
vorbis_lib = $$vorbis_install_dir/libvorbis.dylib
win32{
   vorbis.commands = cd $$vorbis_dir && ./configure --with-ogg-libraries=/usr/local/lib --with-ogg-includes=/usr/local/include --disable-oggtest && make && make install 
}
macx{	
	vorbis.commands = cd $$vorbis_dir && ./configure && make && sudo make install 
}
vorbis.depends = ogg
vorbis.target = $$vorbis_lib
QMAKE_EXTRA_TARGETS += vorbis
PRE_TARGETDEPS += $$vorbis_lib
INCLUDEPATH += $$vorbis_dir/include
# LIBS += $$vorbis_install_dir/libvorbisfile.a $$vorbis_lib $$vorbis_install_dir/libvorbisenc.a 
LIBS += -L/usr/local/lib -lvorbisfile -lvorbis -lvorbisenc 
QMAKE_DISTCLEAN += ; cd $$vorbis_dir ; make uninstall ; make distclean ; cd ../../../


# ogg library
ogg_dir = app/vendors/libogg
ogg_lib = /usr/local/lib/libogg.dylib
win32{
   ogg.commands = cd $$ogg_dir && ./configure && make && make install
}
macx{
   ogg.commands = cd $$ogg_dir && ./configure && make && sudo make install
}
ogg.target = $$ogg_lib
QMAKE_EXTRA_TARGETS += ogg
PRE_TARGETDEPS += $$ogg_lib
INCLUDEPATH += $$ogg_dir/include
LIBS += -logg
QMAKE_DISTCLEAN += ; cd $$ogg_dir ; make uninstall ; make distclean ; cd ../../../


# GNU Science Library (only needed in win)
win32{
   gsl_dir = app/vendors/libgsl
   gsl_lib = /usr/local/lib/libgsl.a

   INCLUDEPATH += /usr/local/include
   LIBS += /usr/local/lib/libgslcblas.a /usr/local/lib/libgsl.a

   gsl.commands = cd $$gsl_dir && ./configure && make && make install
   gsl.target = $$gsl_lib
   QMAKE_EXTRA_TARGETS += gsl
   PRE_TARGETDEPS += $$gsl_lib

   QMAKE_DISTCLEAN += ; cd $$gsl_dir ; make uninstall ; make distclean ; cd ../../../
}

# There should be no need of modifying anything below this line
###############################################################################

# Qmake and QT Config
CONFIG += qt threaded c++11 debug
QT += core widgets webkit webkitwidgets
TEMPLATE = app

# If debug compile
CONFIG(debug, debug|release){
   # Output messages to console 
   CONFIG += console
} else{
   # Optimize
   # QMAKE_CXXFLAGS += -O3
}

# Compiler flags
QMAKE_CXXFLAGS += -Wall -O3
QMAKE_MACOSX_DEPLOYMENT_TARGET = 10.7

# Input
HEADERS += src/*.h
SOURCES += src/*.cpp

# Output
DESTDIR = bin
OBJECTS_DIR += obj
RCC_DIR += obj
MOC_DIR += obj

# Copy resource files
macx{	
   RESOURCES_DIR = $$DESTDIR/$(QMAKE_TARGET).app/Contents/MacOS
}
win32{
   RESOURCES_DIR = $$DESTDIR
}
res.commands = mkdir -p $$RESOURCES_DIR/res \
	&& rsync -avuL --del app/html/ $$RESOURCES_DIR/res/html \
	&& rsync -avuL --exclude=dbm-connect.pd  app/pd/ $$RESOURCES_DIR/res/pd \
   && rsync -avuL --exclude=*.pd_darwin --exclude=*.dll --exclude=*.lib  ../../../app/vendors/hoa/HoaLibrary/PureData/builds/ $$RESOURCES_DIR/res/pd/abstractions \
	&& rsync -avuL ../../../app/vendors/hoa/HoaLibrary/PureData/builds/HrtfDatabase $$RESOURCES_DIR/res/pd
res.target = $$RESOURCES_DIR/res
res.CONFIG = phony
QMAKE_EXTRA_TARGETS += res
POST_TARGETDEPS += $$RESOURCES_DIR/res
QMAKE_DISTCLEAN += ; rm -rf $$DESTDIR/*

# Deploy (create distributable binary)
deploy.target = bin/$(QMAKE_TARGET)
deploy.CONFIG = phony
macx{
   QT_BIN_DIR = ~/Qt/5.2.1/clang_64/bin
	deploy.commands = make distclean && qmake && make release && \
      $$QT_BIN_DIR/macdeployqt bin/$(QMAKE_TARGET).app -dmg
}
win32{
   QT_BIN_DIR = /c/Qt/Qt5.2.1/5.2.1/mingw48_32/bin
   deploy.commands = make distclean && \
      make release && \
      $$QT_BIN_DIR/windeployqt bin/$(QMAKE_TARGET).exe && \
      rsync -avu $$QT_BIN_DIR/libgcc_s_dw2-1.dll $$DESTDIR && \
      rsync -avu $$QT_BIN_DIR/libstdc++-6.dll $$DESTDIR && \
      rsync -avu $$QT_BIN_DIR/libwinpthread-1.dll $$DESTDIR
}
deploy.depends = $(QMAKE_TARGET)
QMAKE_EXTRA_TARGETS += deploy

# Run
run.target = run
macx{
	run.commands = bin/$(QMAKE_TARGET).app/Contents/MacOS/$(QMAKE_TARGET)
}
win32{
   run.commands = bin/$(QMAKE_TARGET).exe
}
run.depends = $(TARGET)
QMAKE_EXTRA_TARGETS += run

# RTAudio Library
HEADERS += vendors/rtaudio/RtAudio.h
SOURCES += vendors/rtaudio/RtAudio.cpp
INCLUDEPATH += vendors/rtaudio/include
INCLUDEPATH += vendors/rtaudio
macx{
   DEFINES += __MACOSX_CORE__ 
   LIBS += -framework CoreFoundation
   LIBS += -framework CoreAudio
   LIBS += -framework Accelerate
}
win32{
   DEFINES -= UNICODE
   
   SOURCES += vendors/rtaudio/include/asio.cpp 
   SOURCES += vendors/rtaudio/include/asiolist.cpp 
   SOURCES += vendors/rtaudio/include/asiodrivers.cpp 
   SOURCES += vendors/rtaudio/include/iasiothiscallresolver.cpp 
   
   HEADERS += vendors/rtaudio/include/asio.h
   HEADERS += vendors/rtaudio/include/asiodrivers.h
   HEADERS += vendors/rtaudio/include/asiolist.h
   HEADERS += vendors/rtaudio/include/asiodrvr.h
   HEADERS += vendors/rtaudio/include/asiosys.h
   HEADERS += vendors/rtaudio/include/ginclude.h
   HEADERS += vendors/rtaudio/include/iasiodrv.h
   HEADERS += vendors/rtaudio/include/iasiothiscallresolver.h

   INCLUDEPATH += vendors/rtaudio/include
   DEFINES += __WINDOWS_DS__ 
   DEFINES += __WINDOWS_ASIO__ 
}

# LibPD Library
libpd_dir = "vendors/libpd"
macx{
   libpd_lib = $$libpd_dir/build/Release/libpd-osx.a
   # libpd_lib = $$libpd_dir/libs/libpd.dylib
   libpd.commands = cd $$libpd_dir && xcodebuild -project libpd.xcodeproj -target libpd-osx -configuration Release
}
win32{
   libpd_lib = $$libpd_dir/libs/libpd.dll
   libpd.commands = cd $$libpd_dir && make && cp libs/libpd.dll ../../bin
 }
libpd.target = $$libpd_lib
DEFINES += LIBPD_USE_STD_MUTEX
QMAKE_EXTRA_TARGETS += libpd
PRE_TARGETDEPS += $$libpd_lib
SOURCES += $$libpd_dir/cpp/*.cpp
HEADERS += $$libpd_dir/cpp/*.hpp
INCLUDEPATH += $${libpd_dir}/libpd_wrapper
INCLUDEPATH += $${libpd_dir}/libpd_wrapper/util
INCLUDEPATH += $${libpd_dir}/cpp
INCLUDEPATH += $${libpd_dir}/pure-data/src
LIBS += $$libpd_lib
QMAKE_DISTCLEAN += ; cd $$libpd_dir ; make clobber ; rm -rf build/* && cd ../../

# system libraries for windows
win32{
   # LIBS += -lstdc++ 
   LIBS += -lgcc
   LIBS += -lpthread
   LIBS += -ldsound
   LIBS += -lwinmm
   LIBS += -lole32
   LIBS += -lws2_32
}

# vim: set ft=make:
