using System;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Net;
using UnityEngine;
using UnityEngine.UI;

public class XrEventBroadcaster : MonoBehaviour
{
    private AndroidJavaObject _ajc;

    public MeshRenderer meshRenderer;
    public RawImage rawImage;
    public int width = 1600;
    public int height = 900;
    public string playerURL = "https://www.google.com";

    private Texture2D texture2D;

    public enum UserAgent
    {
        mobile,
        desktop,
        vr
    }

    private void Awake()
    {
        Debug.Log("[ XReventBroadcaster Script ] Awake(). Starting XrEventBroadcaster script.");
        InitializeAndroidPlugin();
    }

    private void InitializeAndroidPlugin()
    {
        Debug.Log("[ XReventBroadcaster Script ] InitializeAndroidPlugin(). Initializing broadcasterPlugin.");
        var tmpAjc = new AndroidJavaClass("com.xrchisense.xrevent.broadcasterplugin.BroadcasterPlugin");
        _ajc = tmpAjc.CallStatic<AndroidJavaObject>("CreateInstance", new object[] { 1920, 1080, UserAgent.mobile.ToString("G") });

        UnityInterface androidPluginCallbacks = new UnityInterface { broadcaster = this };
        _ajc.Call("SetUnityBitmapCallback", androidPluginCallbacks);
    }



    void Start()
    {
        Debug.Log("[ XReventBroadcaster Script ] Start(). Starting XrEventBroadcaster script.");
        InitializeTexture2D();


        // >> Pass Texture to the Gecko >> This is the former OVRSurface here mTextuere made available through new Surface(mTexture2d)
        // Check Start Routine of Gecko example.
        InitializeGeckoView();
    }

    private void InitializeTexture2D()
    {
        Debug.Log("[ XReventBroadcaster Script ] InitializeTexture2D(). Creating Texture and passing Pointer to Plugin.");
        if (texture2D == null)
        {
            // Create a new texture. The pointer will be passed to the plugin and the texture to the assigned meshrenderer and raw image
            texture2D = new Texture2D(width, height, TextureFormat.RGBA32, false, false);
            //texture2D.wrapMode = TextureWrapMode.Clamp;
            //texture2D.filterMode = FilterMode.Bilinear;
            //texture2D.Apply();
            _ajc.Call("initTextureSampler", (int)texture2D.GetNativeTexturePtr(), width, height);
            
            meshRenderer.material.mainTexture = texture2D;
            rawImage.texture = texture2D;
        }
    }

    private void InitializeGeckoView()
    {
        Debug.Log("[ XReventBroadcaster Script ] InitializeGeckoView(). Fireing up the Gecko.");
        InitSessionAndLoad();
        ActivateGeckoSession();
        InvokeLoadURL();
    }


    // Before calling anything to the plugin, make sure it has drawing enabled
    private void CallAjc(string methodName, object[] paramies)
    {
        if (_ajc != null)
        {
            //_ajc.Call("SetShouldDraw", true);
            _ajc.Call(methodName, paramies);
        }
    }


    void Update()
    {
        if(texture2D != null && _ajc.Call<bool>("isUpdateFrame"))
        {
            Debug.Log("[ XReventBroadcaster Script ] Update(). Update required.");
            _ajc.Call("updateTexture");
            // Invalidate any cached render state tied to the active graphics API to draw out GL state instead of Unity rendering engines
            GL.InvalidateState();
        }
    }


    /* 
     *  PluginMethods: Buttoninteractions, ...
     * 
     */

    #region PluginMethods

    private void InitSessionAndLoad()
    {
        CallAjc("LoadUrlIfUnopened", new object[] { playerURL });
    }
    
    public void DeactivateGeckoSession()
    {
        CallAjc("ActivateSession", new object[] { false });
    }

    public void ActivateGeckoSession()
    {
        CallAjc("ActivateSession", new object[] { true });
    }

    public void InvokeLoadURL()
    {
        if (playerURL == "")
        {
            LoadURL("xrchisense.de");
        }

        string potentialUrl = playerURL;

        if (ValidHttpURL(potentialUrl, out var outUri))
        {
            LoadURL(outUri.AbsoluteUri);
        }
        else
        {
            string encodedSearchString = WebUtility.UrlEncode(potentialUrl);
            string searchUrl = "https://www.google.com/search?q=" + encodedSearchString;
            LoadURL(searchUrl);
        }

    }

    public void LoadURL(string url)
    {
        SetInputFieldUrl(url);
        CallAjc("LoadURL", new object[] { url });
    }

    private bool ValidHttpURL(string s, out Uri resultURI)
    {
        bool returnVal = false;

        if (!Regex.IsMatch(s, @"^https?:\/\/", RegexOptions.IgnoreCase))
            s = "http://" + s;

        if (Uri.TryCreate(s, UriKind.Absolute, out resultURI))
            returnVal = (resultURI.Scheme == Uri.UriSchemeHttp ||
                         resultURI.Scheme == Uri.UriSchemeHttps);

        if (!s.Contains(".") || s.Contains(" "))
        {
            returnVal = false;
        }

        if (!Uri.IsWellFormedUriString(s, UriKind.Absolute))
            returnVal = false;


        return returnVal;
    }


    #endregion

    /*
     *  Implementation of UnityInterface for Android Calls
     * 
     */

    #region UnityInterfaceImpl

    // method to to tap in the right coords despite difference in scaling
    private void AddTap(Vector3 pos)
    {
      
    }

    public void SetInputFieldUrl(string url)
    {
      
    }

    public void UpdateProgress(int progress)
    {
     
        Debug.Log("_TAKESNAP: Texture copied! " + Time.realtimeSinceStartup);

        //Debug.Log("_OverLay Format: " + _overlay.textures[0].graphicsFormat); // <-- Lets check the format
    }

    public void CanGoBack(bool canGoBack)
    {
      
    }

    public void CanGoForward(bool canGoForward)
    {
     
    }

    private string _filePathToReadWhenComplete = "";
    public void PrepareReadFile(string path, string directory, string fileName, string url)
    {
      
    }

    public void ReadFile()
    {
        Debug.Log("abs path with filename is: " + _filePathToReadWhenComplete);
        string fileContents = System.IO.File.ReadAllText(_filePathToReadWhenComplete);
        Debug.Log("file contents are: " + fileContents);
    }


    public void OnPageVisited(string url, string lastUrl)
    {
        Debug.Log("on page visited: " + url);
        Debug.Log("last page visited: " + lastUrl);
        
    }


    // used for autofill text, if the input field target changes
    public void RestartInput()
    {

    }

    // reload the last url
    public void OnSessionCrash()
    {
        Debug.Log("Attempting browser restart");
        //CallAjc("RestartBrowser", new object[]{("trash", true)});   
    }

#endregion

    /*
     *  Interface for Android Plugin Calls
     * 
     */

#region UnityInterface

    class UnityInterface : AndroidJavaProxy
    {
        public UnityInterface() : base("com.xrchisense.xrevent.broadcasterplugin.UnityInterface")
        {
        }

        public XrEventBroadcaster broadcaster;


        public void updateProgress(int progress)
        {
            //            Debug.Log("update progress called ");
            UnityThread.executeInUpdate(() => broadcaster.UpdateProgress(progress));
        }

        // TODO: implement different sessions for youtube vs. browser
        public void CanGoBack(bool able)
        {
            //            Debug.Log("Gecko Says we can go back");
            UnityThread.executeInUpdate(() => broadcaster.CanGoBack(able));
        }

        // TODO: implement different sessions for youtube vs. browser
        public void CanGoForward(bool able)
        {
            //            Debug.Log("Gecko Says we can go forward");
            UnityThread.executeInUpdate(() => broadcaster.CanGoForward(able));
        }

        public void updateURL(string url)
        {
            //            Debug.Log("update url called! " + url);
            UnityThread.executeInUpdate(() => broadcaster.SetInputFieldUrl(url));
        }

        public void OnPageVisited(string url, string lastUrl)
        {
            UnityThread.executeInUpdate(() => broadcaster.OnPageVisited(url, lastUrl));
        }

        public void ChangeKeyboardVisiblity(bool show)
        {
      //ByTOB      UnityThread.executeInUpdate(() => broadcaster.ChangeKeyboardVisiblity(show));
        }

        public void RestartInput()
        {
            UnityThread.executeInUpdate(broadcaster.RestartInput);
        }

        public void OnSessionCrash()
        {
            UnityThread.executeInUpdate(broadcaster.OnSessionCrash);
        }

        public void OnFullScreenRequestChange(bool fullScreen)
        {

            //            UnityThread.executeInUpdate(() => BrowserView.OnFullScreenRequestChange(fullScreen));

        }

        //    public void DownloadFileRequestedAtURL(string path, string directory, string fileName, string url)
        //    {
        //        Debug.Log("message from android about download files: " + url);
        //        
        //        UnityThread.executeInUpdate(()=> BrowserView.PrepareReadFile(path,directory,fileName,url));
        //    }
        //
        //    public void FileDownloadComplete()
        //    {
        //        UnityThread.executeInUpdate(()=> BrowserView.ReadFile());
        //
        //    }

    }
#endregion

}
