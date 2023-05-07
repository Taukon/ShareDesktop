#include <napi.h>

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <iostream>
#include <stdlib.h>

int app_width = 0;
int app_height = 0;
int app_depth = 0;
int app_fb_bpp = 0;
bool is_initialize = false;

void initialize()
{
    if (!is_initialize)
    {
        Display *display;
        XImage *img;
        int width = 0;
        int height = 0;
        Window window, root_return, parent_return, *children_return;
        unsigned int nchildren_return;
        XWindowAttributes attributes;

        display = XOpenDisplay(NULL);
        window = DefaultRootWindow(display);
        XQueryTree(display, window, &root_return, &parent_return, &children_return, &nchildren_return);

        if (nchildren_return)
        {

            bool state = false;
            int temp_width = 0;
            int temp_height = 0;
            while (nchildren_return--)
            {
                if (XGetWindowAttributes(display, children_return[nchildren_return], &attributes) && attributes.map_state == IsViewable)
                {
                    // window = root_return; // children_return[nchildren_return];
                    if (temp_width < attributes.width)
                        temp_width = attributes.width;
                    if (temp_height < attributes.height)
                        temp_height = attributes.height;

                    state = true;
                    // break;
                }
            }

            if (state){
                width = temp_width;
                height = temp_height;
            }else
            {
                //window = root_return;
                width = XDisplayWidth(display, 0);
                height = XDisplayHeight(display, 0);
            }
            XFree(children_return);
        }
        else
        {
            //window = root_return;
            width = XDisplayWidth(display, 0);
            height = XDisplayHeight(display, 0);
        }

        img = XGetImage(display, window, 0, 0, width, height, AllPlanes, ZPixmap);

        app_width = width;
        app_height = height;
        app_depth = img->depth;
        app_fb_bpp = img->bits_per_pixel;

        free(img->data);
        img->data = NULL;
        XDestroyImage(img);
        XCloseDisplay(display);


        is_initialize = true;
    }
}

char *getImg(size_t *mem_size)
{
    Display *display;
    XImage *img;
    int width = 0;
    int height = 0;
    Window window, root_return, parent_return, *children_return;
    unsigned int nchildren_return;
    XWindowAttributes attributes;

    display = XOpenDisplay(NULL);
    window = DefaultRootWindow(display);
    XQueryTree(display, window, &root_return, &parent_return, &children_return, &nchildren_return);

    if (children_return)
    {

        bool state = false;
        int temp_width = 0;
        int temp_height = 0;
        while (nchildren_return--)
        {
            if (XGetWindowAttributes(display, children_return[nchildren_return], &attributes) && attributes.map_state == IsViewable)
            {
                //window = root_return; // children_return[nchildren_return];
                if (temp_width < attributes.width)
                    temp_width = attributes.width;
                if (temp_height < attributes.height)
                    temp_height = attributes.height;

                state = true;
                //break;
            }
        }

        if (state)
        {
            width = temp_width;
            height = temp_height;
        }
        else
        {
            // window = root_return;
            width = XDisplayWidth(display, 0);
            height = XDisplayHeight(display, 0);
        }
        XFree(children_return);
    }
    else
    {
        //window = root_return;
        width = XDisplayWidth(display, 0);
        height = XDisplayHeight(display, 0);
    }

    img = XGetImage(display, window, 0, 0, width, height, AllPlanes, ZPixmap);

    int bpp = (int)img->bits_per_pixel / 8; // 4

    char *buffer = (char *)malloc(sizeof(char) * bpp * img->width * img->height);

    *mem_size = sizeof(char) * bpp * img->width * img->height;

    memcpy(buffer, img->data, bpp * img->width * img->height);

    app_width = width;
    app_height = height;
    app_depth = img->depth;
    app_fb_bpp = img->bits_per_pixel;

    free(img->data);
    img->data = NULL;
    XDestroyImage(img);
    XCloseDisplay(display);

    return buffer;
}

void cleanup(Napi::Env env, void *arg)
{
    free(arg);
}

Napi::Value screenshot(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    size_t msize;
    char *img = getImg(&msize);

    return Napi::Buffer<char>::New(env, img, msize, cleanup);
}

Napi::Value getWidth(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initialize();

    Napi::Number width = Napi::Number::New(env, app_width);

    return width;
}

Napi::Value getHeight(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initialize();

    Napi::Number height = Napi::Number::New(env, app_height);

    return height;
}

Napi::Value getDepth(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initialize();

    Napi::Number depth = Napi::Number::New(env, app_depth);

    return depth;
}

Napi::Value getFb_bpp(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initialize();

    Napi::Number fb_bpp = Napi::Number::New(env, app_fb_bpp);

    return fb_bpp;
}

//--- full screen
int full_width = 0;
int full_height = 0;
int full_depth = 0;
int full_fb_bpp = 0;
bool is_initialize_full = false;

void initializeFull()
{
    if (!is_initialize_full)
    {
        Display *display;
        XImage *img;
                
        display = XOpenDisplay(NULL);

        Window window = DefaultRootWindow(display);
        int width = XDisplayWidth(display, 0);
        int height = XDisplayHeight(display, 0);

        img = XGetImage(display, window, 0, 0, width, height, AllPlanes, ZPixmap);

        full_width = width;
        full_height = height;
        full_depth = img->depth;
        full_fb_bpp = img->bits_per_pixel;

        free(img->data);
        img->data = NULL;
        XDestroyImage(img);
        XCloseDisplay(display);

        is_initialize_full = true;
    }
}

char *getImgFull(size_t *mem_size)
{
    Display *display;
    XImage *img;

    display = XOpenDisplay(NULL);

    Window window = DefaultRootWindow(display);
    int width = XDisplayWidth(display, 0);
    int height = XDisplayHeight(display, 0);

    img = XGetImage(display, window, 0, 0, width, height, AllPlanes, ZPixmap);

    int bpp = (int)img->bits_per_pixel / 8; // 4

    char *buffer = (char *)malloc(sizeof(char) * bpp * img->width * img->height);

    *mem_size = sizeof(char) * bpp * img->width * img->height;

    memcpy(buffer, img->data, bpp * img->width * img->height);

    full_width = width;
    full_height = height;
    full_depth = img->depth;
    full_fb_bpp = img->bits_per_pixel;

    free(img->data);
    img->data = NULL;
    XDestroyImage(img);
    XCloseDisplay(display);

    return buffer;
}

Napi::Value screenshotFull(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    size_t msize;
    char *img = getImgFull(&msize);

    return Napi::Buffer<char>::New(env, img, msize, cleanup);
}

Napi::Value getWidthFull(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initializeFull();

    Napi::Number width = Napi::Number::New(env, full_width);

    return width;
}

Napi::Value getHeightFull(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initializeFull();

    Napi::Number height = Napi::Number::New(env, full_height);

    return height;
}

Napi::Value getDepthFull(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initializeFull();

    Napi::Number depth = Napi::Number::New(env, full_depth);

    return depth;
}

Napi::Value getFb_bppFull(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    initializeFull();

    Napi::Number fb_bpp = Napi::Number::New(env, full_fb_bpp);

    return fb_bpp;
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "screenshot"),
                Napi::Function::New(env, screenshot));
    exports.Set(Napi::String::New(env, "getWidth"),
                Napi::Function::New(env, getWidth));
    exports.Set(Napi::String::New(env, "getHeight"),
                Napi::Function::New(env, getHeight));
    exports.Set(Napi::String::New(env, "getDepth"),
                Napi::Function::New(env, getDepth));
    exports.Set(Napi::String::New(env, "getFb_bpp"),
                Napi::Function::New(env, getFb_bpp));

    exports.Set(Napi::String::New(env, "screenshotFull"),
                Napi::Function::New(env, screenshotFull));
    exports.Set(Napi::String::New(env, "getWidthFull"),
                Napi::Function::New(env, getWidthFull));
    exports.Set(Napi::String::New(env, "getHeightFull"),
                Napi::Function::New(env, getHeightFull));
    exports.Set(Napi::String::New(env, "getDepthFull"),
                Napi::Function::New(env, getDepthFull));
    exports.Set(Napi::String::New(env, "getFb_bppFull"),
                Napi::Function::New(env, getFb_bppFull));
    return exports;
}

NODE_API_MODULE(screenshot, Init);