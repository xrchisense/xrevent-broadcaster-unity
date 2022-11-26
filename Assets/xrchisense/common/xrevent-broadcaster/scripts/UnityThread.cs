#define ENABLE_UPDATE_FUNCTION_CALLBACK
//#define ENABLE_LATEUPDATE_FUNCTION_CALLBACK
//#define ENABLE_FIXEDUPDATE_FUNCTION_CALLBACK

using System;
using System.Collections;
using UnityEngine;
using System.Collections.Generic;


public class UnityThread : MonoBehaviour
{
    //our (singleton) instance
    private static UnityThread instance = null;


    ////////////////////////////////////////////////UPDATE IMPL////////////////////////////////////////////////////////
    //Holds actions received from another Thread. Will be coped to actionCopiedQueueUpdateFunc then executed from there
    private static List<System.Action> actionQueuesUpdateFunc = new List<Action>();

    //holds Actions copied from actionQueuesUpdateFunc to be executed
    List<System.Action> actionCopiedQueueUpdateFunc = new List<System.Action>();

    // Used to know if whe have new Action function to execute. This prevents the use of the lock keyword every frame
    private volatile static bool noActionQueueToExecuteUpdateFunc = true;


    //Used to initialize UnityThread. Call once before any function here
    public static void initUnityThread(bool visible = false)
    {
        if (instance != null)
        {
            return;
        }

        if (Application.isPlaying)
        {
            // add an invisible game object to the scene
            GameObject obj = new GameObject("MainThreadExecuter");
            if (!visible)
            {
                obj.hideFlags = HideFlags.HideAndDontSave;
            }

            DontDestroyOnLoad(obj);
            instance = obj.AddComponent<UnityThread>();
        }
    }

    public void Awake()
    {
        DontDestroyOnLoad(gameObject);
    }

    //////////////////////////////////////////////COROUTINE IMPL//////////////////////////////////////////////////////
#if (ENABLE_UPDATE_FUNCTION_CALLBACK)
    public static void executeCoroutine(IEnumerator action)
    {
        if (instance != null)
        {
            executeInUpdate(() => instance.StartCoroutine(action));
        }
    }

    ////////////////////////////////////////////UPDATE IMPL////////////////////////////////////////////////////
    public static void executeInUpdate(System.Action action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (actionQueuesUpdateFunc)
        {
            actionQueuesUpdateFunc.Add(action);
            noActionQueueToExecuteUpdateFunc = false;
        }
    }

    public void Update()
    {
        if (noActionQueueToExecuteUpdateFunc)
        {
            return;
        }

        //Clear the old actions from the actionCopiedQueueUpdateFunc queue
        actionCopiedQueueUpdateFunc.Clear();
        lock (actionQueuesUpdateFunc)
        {
            //Copy actionQueuesUpdateFunc to the actionCopiedQueueUpdateFunc variable
            actionCopiedQueueUpdateFunc.AddRange(actionQueuesUpdateFunc);
            //Now clear the actionQueuesUpdateFunc since we've done copying it
            actionQueuesUpdateFunc.Clear();
            noActionQueueToExecuteUpdateFunc = true;
        }

        // Loop and execute the functions from the actionCopiedQueueUpdateFunc
        for (int i = 0; i < actionCopiedQueueUpdateFunc.Count; i++)
        {
            actionCopiedQueueUpdateFunc[i].Invoke();
        }
    }
#endif

    public void OnDisable()
    {
        if (instance == this)
        {
            instance = null;
        }
    }
}