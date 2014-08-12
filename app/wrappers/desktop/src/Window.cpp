/**
 helloHTML A C++ example program that uses Webkit, html, css and javascript 
 code as a GUI.

 Copyright (C) 2012 Rafael Vega
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/ 

#include <iostream>
#include <QWebFrame>
#include <QStandardPaths>
#include <QApplication>
#include <QMouseEvent>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QDesktopServices>
#include "Window.h"
#include "WebPage.h"

// Constructor
DBM::Window::Window(int width, int height, QString htmlFilePath, PdBridge* brdg, QObject* parent):
QObject(parent),
width(width),
height(height),
htmlFilePath(htmlFilePath),
bridge(brdg)
{
   console = new Console(this);
   file = new File(this);

   window = new QMainWindow();
   window->setMaximumSize(width, height);
   window->setMinimumSize(width, height);


   // A hack to fix radio buttons in windows.
   // https://bugreports.qt-project.org/browse/QTBUG-34163
   QApplication::setStyle( new PatchedWebViewStyle() );

   
   webView = new QWebView(window);
   webView->setAttribute(Qt::WA_AcceptTouchEvents, false);
   webView->setContextMenuPolicy(Qt::NoContextMenu);

   WebPage* page = new WebPage(webView);
   webView->setPage(page);

   // page->settings()->setAttribute(QWebSettings::LocalStorageEnabled, true);
   // QWebSettings* settings = QWebSettings::globalSettings();
   // settings->setAttribute(QWebSettings::LocalStorageEnabled, true);

   webView->page()->mainFrame()->setScrollBarPolicy( Qt::Vertical, Qt::ScrollBarAlwaysOff );
   webView->page()->mainFrame()->setScrollBarPolicy( Qt::Horizontal, Qt::ScrollBarAlwaysOff );

   connectToJS();
   connect( webView->page()->mainFrame(), SIGNAL(javaScriptWindowObjectCleared()), this, SLOT(connectToJS()) );
   webView->resize(width, height);
   webView->load(QUrl(htmlFilePath));

   webView->page()->setLinkDelegationPolicy(QWebPage::DelegateExternalLinks);
   connect( webView->page(), SIGNAL(linkClicked(QUrl)), this, SLOT(linkClicked(QUrl)) );

   bridge->setPage(page);

   window->show();

};

DBM::Window::~Window(){
   delete window;
}

void DBM::Window::linkClicked(QUrl url){
   QDesktopServices::openUrl(url);
}

/**
 * Exposes this class to the javascript code.
 */
void DBM::Window::connectToJS(){
   webView->page()->mainFrame()->addToJavaScriptWindowObject(QString("QT"), bridge);
   webView->page()->mainFrame()->addToJavaScriptWindowObject(QString("QTFile"), file);
   webView->page()->mainFrame()->addToJavaScriptWindowObject(QString("console"), console);
} 
