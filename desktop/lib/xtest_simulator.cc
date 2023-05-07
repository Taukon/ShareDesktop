#include <napi.h>

#include <iostream>
#include <stdlib.h>

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/XKBlib.h>
#include <X11/keysym.h>
#include <X11/extensions/XTest.h> //sudo apt-get install libxtst-dev


Napi::Value testKeyEvent(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    uint32_t keySim = info[0].As<Napi::Number>().Uint32Value();
    bool down = info[1].As<Napi::Boolean>().Value();

    Display *display = XOpenDisplay(NULL);

    if(display){
        uint32_t keyCode = XKeysymToKeycode(display, keySim);

        if (keyCode != 0)
        {
            //printf("key: %d \n", down);
            XTestFakeKeyEvent(display, keyCode, down, 0L);
        }

        XCloseDisplay(display);
        //display = NULL;
    }

    return env.Null();
}

Napi::Value testMotionEvent(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    int x = info[0].As<Napi::Number>().Int32Value();
    int y = info[1].As<Napi::Number>().Int32Value();

    Display *display = XOpenDisplay(NULL);

    if (display)
    {
        XTestFakeMotionEvent(display, -1, x, y, 0L);

        XCloseDisplay(display);
        //display = NULL;
    }

    return env.Null();
}

Napi::Value testButtonEvent(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    int buttonMask = info[0].As<Napi::Number>().Int32Value();
    bool down = info[1].As<Napi::Boolean>().Value();

    Display *display = XOpenDisplay(NULL);

    if (display)
    {
        if (buttonMask == 0x10)
        {
            //printf("scroll down ");
            //  buttonMask: 0x10 -> 0x5
            buttonMask = 0x5;
            XTestFakeButtonEvent(display, buttonMask, 1, 0L);
            XTestFakeButtonEvent(display, buttonMask, 0, 0L);
        }
        else if (buttonMask == 0x8)
        {
            //printf("scroll up ");
            //  buttonMask: 0x8 -> 0x4
            buttonMask = 0x4;
            XTestFakeButtonEvent(display, buttonMask, 1, 0L);
            XTestFakeButtonEvent(display, buttonMask, 0, 0L);
        }
        else {

            if (buttonMask == 0x4)
            {
                //printf("right click ");
                //  buttonMask: 0x4 -> 0x2 0x3 ?
                buttonMask = 0x3;
            }
            /*else if (buttonMask == 0x2)
            {
                // printf("wheel click ");
                //  buttonMask: 0x2 -> ?
                //  buttonMask = 0xa;
            }*/

            if (buttonMask != 0)
            {
                XTestFakeButtonEvent(display, buttonMask, down, 0L);
                //printf("buttonMask: 0x%x\n", buttonMask);
            }
        }

        XCloseDisplay(display);
        //display = NULL;
    }

    return env.Null();
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "testKeyEvent"),
                Napi::Function::New(env, testKeyEvent));
    exports.Set(Napi::String::New(env, "testMotionEvent"),
                Napi::Function::New(env, testMotionEvent));
    exports.Set(Napi::String::New(env, "testButtonEvent"),
                Napi::Function::New(env, testButtonEvent));
    return exports;
}

NODE_API_MODULE(xtest, Init);