#pragma once

#include <QString>
#include <QMainWindow>
#include <QWebView>

#include <QProxyStyle>
#include <QWebView>
#include <QStyleOption>

#include "PdBridge.h"
#include "Console.h"
#include "File.h"

namespace DBM{
   /**
    * The Window Class encapsulates a WebKit web browser to be used as a GUI canvas and 
    * provides an API to communicate to and from the Javascript code running within it.
    */
   class Window: public QObject {
      Q_OBJECT

      public:
         explicit Window(int width, int height, QString htmlFilePath, PdBridge* brdg, QObject* parent = 0);
         virtual ~Window();

      protected:
         int width;
         int height;
         QString htmlFilePath;
         QMainWindow* window;
         QWebView* webView;
         PdBridge* bridge;
         Console* console;
         File* file;

      public slots:
         void connectToJS();
   };
};


// A hack to fix radio buttons in windows.
// https://bugreports.qt-project.org/browse/QTBUG-34163
class PatchedWebViewStyle : public QProxyStyle{
   void drawControl(ControlElement element, const QStyleOption* option, QPainter* painter, const QWidget* widget) const{
      if( element == QStyle::CE_CheckBox || element == QStyle::CE_RadioButton ) {
         option->styleObject->setProperty( "_q_no_animation", true );
      }
      QProxyStyle::drawControl( element, option, painter, widget );
   }
};