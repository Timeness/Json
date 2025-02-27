import io
import re
import os
import sys
import json
import html
import httpx
import pymongo
import aiohttp
import asyncio
import requests
import traceback
import contextlib
import cloudscraper
from time import time
from os import environ as env
from pyrogram import Client, filters
from bs4 import BeautifulSoup
from inspect import getfullargspec
from pyrogram.enums import ParseMode
from typing import Optional, Tuple, Any
from pyrogram.errors import MessageTooLong
from pyrogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup

var = {}
teskode = {}

class Config:
    SUDOERS = list(map(int, env.get("SUDOERS", "6505111743 6517565595 5896960462 5220416927").split()))
    PREFIXS = list(env.get("PREFIXS", "? * $ . ! /").split())
    API_ID = int(env.get("API_ID", "29400566"))
    API_HASH = str(env.get("API_HASH", "8fd30dc496aea7c14cf675f59b74ec6f"))
    BOT_TOKEN = str(env.get("BOT_TOKEN", "8054875786:AAG3YDeTKlFJv9tvXJuQQUABECmYI9gFbJk"))

app = Client(
    name="ScoucerX",
    api_id=Config.API_ID,
    api_hash=Config.API_HASH,
    bot_token=Config.BOT_TOKEN,
    in_memory=True
)

from httpx import AsyncClient

async def WebScrap(Link: str, *args, **kwargs):
    async with aiohttp.ClientSession() as session:
        async with session.get(Link, *args, **kwargs) as response:
            try:
                data = await response.json()
            except Exception:
                data = await response.text()
    return data

Fetch = AsyncClient(
    http2=True,
    verify=False,
    headers={
        "Accept-Language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edge/107.0.1418.42"
    },
    timeout=httpx.Timeout(20)
)

import ast
from typing import List, Optional

async def myEval(code, globs, **kwargs):
    locs = {}
    globs = globs.copy()
    global_args = "_globs"
    while global_args in globs.keys():
        global_args = f"_{global_args}"
    kwargs[global_args] = {}
    for glob in ["__name__", "__package__"]:
        kwargs[global_args][glob] = globs[glob]

    root = ast.parse(code, "exec")
    code = root.body
    ret_name = "_ret"
    ok = False
    while True:
        if ret_name in globs.keys():
            ret_name = f"_{ret_name}"
            continue
        for node in ast.walk(root):
            if isinstance(node, ast.Name) and node.id == ret_name:
                ret_name = f"_{ret_name}"
                break
            ok = True
        if ok:
            break

    if not code:
        return None
    if not any(isinstance(node, ast.Return) for node in code):
        for i in range(len(code)):
            if isinstance(code[i], ast.Expr) and (
                i == len(code) - 1 or not isinstance(code[i].value, ast.Call)
            ):
                code[i] = ast.copy_location(
                    ast.Expr(
                        ast.Call(
                            func=ast.Attribute(
                                value=ast.Name(id=ret_name, ctx=ast.Load()),
                                attr="append",
                                ctx=ast.Load(),
                            ),
                            args=[code[i].value],
                            keywords=[],
                        )
                    ),
                    code[-1],
                )
    else:
        for node in code:
            if isinstance(node, ast.Return):
                node.value = ast.List(elts=[node.value], ctx=ast.Load())

    code.append(
        ast.copy_location(
            ast.Return(value=ast.Name(id=ret_name, ctx=ast.Load())), code[-1]
        )
    )
    glob_copy = ast.Expr(
        ast.Call(
            func=ast.Attribute(
                value=ast.Call(
                    func=ast.Name(id="globals", ctx=ast.Load()), args=[], keywords=[]
                ),
                attr="update",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(arg=None, value=ast.Name(id=global_args, ctx=ast.Load()))
            ],
        )
    )
    ast.fix_missing_locations(glob_copy)
    code.insert(0, glob_copy)
    ret_decl = ast.Assign(
        targets=[ast.Name(id=ret_name, ctx=ast.Store())],
        value=ast.List(elts=[], ctx=ast.Load()),
    )
    ast.fix_missing_locations(ret_decl)
    code.insert(1, ret_decl)
    args = []
    for a in list(map(lambda x: ast.arg(x, None), kwargs.keys())):
        ast.fix_missing_locations(a)
        args += [a]
    args = ast.arguments(
        args=[],
        vararg=None,
        kwonlyargs=args,
        kwarg=None,
        defaults=[],
        kw_defaults=[None for _ in range(len(args))],
    )
    args.posonlyargs = []
    fun = ast.AsyncFunctionDef(
        name="tmp", args=args, body=code, decorator_list=[], returns=None
    )
    ast.fix_missing_locations(fun)
    mod = ast.parse("")
    mod.body = [fun]
    comp = compile(mod, "<string>", "exec")

    exec(comp, {}, locs)

    r = await locs["tmp"](**kwargs)
    for i in range(len(r)):
        if hasattr(r[i], "__await__"):
            r[i] = await r[i]
    i = 0
    while i < len(r) - 1:
        if r[i] is None:
            del r[i]
        else:
            i += 1
    if len(r) == 1:
        [r] = r
    elif not r:
        r = None
    return r


def format_exception(
    exp: BaseException, tb: Optional[List[traceback.FrameSummary]] = None
) -> str:
    """ғᴏʀᴍᴀᴛs ᴀɴ ᴇxᴄᴇᴘᴛɪᴏɴ ᴛʀᴀᴄᴇʙᴀᴄᴋ ᴀs ᴀ sᴛʀɪɴɢ sɪᴍɪʟᴀʀ ᴛᴏ ᴛʜᴇ __Pʏᴛʜᴏɴ__ ɪɴᴛᴇʀᴘʀᴇᴛᴇʀ."""
    if tb is None:
        tb = traceback.extract_tb(exp.__traceback__)
    cwd = os.getcwd()
    for frame in tb:
        if cwd in frame.filename:
            frame.filename = os.path.relpath(frame.filename)
    stack = "".join(traceback.format_list(tb))
    msg = str(exp)
    if msg:
        msg = f": {msg}"
    return f"Traceback (most recent call last):\n{stack}{type(exp).__name__}{msg}"
  

def readable_Time(seconds: int) -> str:
    result = ""
    (days, remainder) = divmod(seconds, 86400)
    days = int(days)
    if days != 0:
        result += f"{days}ᴅ:"
    (hours, remainder) = divmod(remainder, 3600)
    hours = int(hours)
    if hours != 0:
        result += f"{hours}ʜ:"
    (minutes, seconds) = divmod(remainder, 60)
    minutes = int(minutes)
    if minutes != 0:
        result += f"{minutes}ᴍ:"
    seconds = int(seconds)
    result += f"{seconds}s"
    return result

async def eos_Send(msg, **kwargs):
    func = msg.edit if msg.from_user.is_self else msg.reply
    spec = getfullargspec(func.__wrapped__).args
    await func(**{k: v for k, v in kwargs.items() if k in spec})

@app.on_message((filters.command("ex", Config.PREFIXS) | filters.regex(r"app.run\(\)$")))
@app.on_edited_message((filters.command("ex", Config.PREFIXS) | filters.regex(r"app.run\(\)$")))
async def exece_Terms(app:app, msg:Message) -> Optional[str]:
    if (msg.command and len(msg.command) == 1) or msg.text == "app.run()":
        return await eos_Send(msg, text="**ɴᴏ ᴇᴠᴀʟᴜᴀᴛᴇ ᴍᴇssᴀɢᴇ ғᴏᴜɴᴅ !**")
    message = await msg.reply("**ᴘʀᴏᴄᴇssɪɴɢ ᴄᴏᴅᴇ...**")
    code = msg.text.split(maxsplit=1)[1] if msg.command else msg.text.split("\napp.run()")[0]
    out_code = io.StringIO()
    out = ""
    human = readable_Time
    reply_by = msg
    if msg.reply_to_message:
        reply_by = msg.reply_to_message
    sticker = reply_by.sticker.file_id if hasattr(reply_by, 'sticker') and reply_by.sticker else None
    user = reply_by.from_user if hasattr(reply_by, 'from_user') and reply_by.from_user else reply_by
    async def _eval() -> Tuple[str, Optional[str]]:
        async def send(*args: Any, **kwargs: Any) -> Message:
            return await msg.reply(*args, **kwargs)
        #
        #
        def _print(*args: Any, **kwargs: Any) -> None:
            if "file" not in kwargs:
                kwargs["file"] = out
            return print(*args, **kwargs)

        def _help(*args: Any, **kwargs: Any) -> None:
            with contextlib.redirect_stdout(out_code):
                help(*args, **kwargs)

        eval_vars = {
            "app": app,
            "humantime": human,
            "msg": msg,
            "m": msg,
            "db": "mongo:localhost/database:7000",
            "var": var,
            "teskode": teskode,
            "re": re,
            "os": os,
            "user": user,
            "sticker": sticker,
            "ParseMode": ParseMode,
            "sendMsg": app.send_message,
            "copyMsg": app.copy_message,
            "forwardMsg": app.forward_messages,
            "sendPhoto": app.send_photo,
            "sendVideo": app.send_video,
            "deleteMsg": app.delete_messages,
            "pinMsg": app.pin_chat_message,
            "MARKDOWN": ParseMode.MARKDOWN,
            "HTML": ParseMode.HTML,
            "IKB": InlineKeyboardButton,
            "IKM": InlineKeyboardMarkup,
            "asyncio": asyncio,
            "cloudscraper": cloudscraper,
            "json": json,
            "aiohttp": aiohttp,
            "print": msg.reply,
            "send": send,
            "stdout": out_code,
            "traceback": traceback,
            "webscrap": WebScrap,
            "fetch": Fetch,
            "reply": msg.reply_to_message,
            "requests": requests,
            "soup": BeautifulSoup,
            "help": _help,
        }
        eval_vars.update(var)
        eval_vars.update(teskode)
        try:
            return "", await myEval(code, globals(), **eval_vars)
        except Exception as eo:
            first_snip_idx = -1
            tb = traceback.extract_tb(eo.__traceback__)
            for i, frame in enumerate(tb):
                if frame.filename == "<string>" or frame.filename.endswith("ast.py"):
                    first_snip_idx = i
                    break
            #
            #
            stripped_tb = tb[first_snip_idx:]
            formatted_tb = format_exception(eo, tb=stripped_tb)
            return "⚠️ ᴇʀʀᴏʀ ᴡʜɪʟᴇ ᴇxᴇᴄᴜᴛɪɴɢ sɴɪᴘᴘᴇᴛ\n\n", formatted_tb

    before = time()
    prefix, result = await _eval()
    after = time()
    if not out_code.getvalue() or result is not None:
        print(result, file=out_code)
    el_us = after - before
    try:
        el_str = readable_Time(el_us)
    except:
        el_str = "1s"
    if not el_str or el_str is None:
        el_str = "0.1s"
    out = out_code.getvalue()
    if out.endswith("\n"):
        out = out[:-1]
    try:
        success = f"{prefix}**ɪɴᴘᴜᴛ:**\n<pre>{code}</pre>\n**ᴏᴜᴛᴘᴜᴛ:**\n<pre>{out}</pre>\n**ᴇxᴇᴄᴜᴛᴇᴅ ᴛɪᴍᴇ:** {el_str}"
        await eos_Send(msg, text=success)
        await message.delete()
    except MessageTooLong:
        with io.BytesIO(str.encode(success)) as Zeep:
            Zeep.name = "LinuxTerm.txt"
            await msg.reply_document(
                document=Zeep,
                caption=f"**ᴇᴠᴀʟ:**\n<pre language='python'>{code}</pre>\n\n**ʀᴇsᴜʟᴛ:**\nᴀᴛᴛᴀᴄʜᴇᴅ ᴅᴏᴄᴜᴍᴇɴᴛ ɪɴ ғɪʟᴇ !",
                disable_notification=True,
                #thumb="Graph/Templates/Pexels.jpg",
                reply_to_message_id=reply_by.id
            )
        await message.delete()
    return
    
async def aexec(code, app, msg):
    exec(
        "async def __aexec(app, msg): "
        + "\n p = print"
        + "\n replied = msg.reply_to_message"
        + "".join(f"\n {l_}" for l_ in code.split("\n"))
    )
    return await locals()["__aexec"](app, msg)


import io
import sys
import traceback
from datetime import datetime
from pyrogram import filters
from pyrogram.types import Message

@app.on_message(filters.command("p2"))
@app.on_edited_message(filters.command("p2"))
async def runPyro_Funcs(app: app, msg: Message) -> None:
    code = msg.text.split(None, 1)
    if len(code) == 1:
        return await msg.reply(" ᴄᴏᴅᴇ ɴᴏᴛ ғᴏᴜɴᴅ !")
    message = await msg.reply("ʀᴜɴɴɪɴɢ...")
    soac = datetime.now()
    osder = sys.stderr
    osdor = sys.stdout
    redr_opu = sys.stdout = io.StringIO()
    redr_err = sys.stderr = io.StringIO()
    stdout, stderr, exc = None, None, None
    try:
        vacue = await aexec(code[1], app, msg)
    except Exception:
        exc = traceback.format_exc()
    stdout = redr_opu.getvalue()
    stderr = redr_err.getvalue()
    sys.stdout = osdor
    sys.stderr = osder
    evason = exc or stderr or stdout or vacue or "ɴᴏ ᴏᴜᴛᴘᴜᴛ"
    eoac = datetime.now()
    runcs = (eoac - soac).microseconds / 1000
    oucode = f"📎 ᴄᴏᴅᴇ:\n{code[1]}\n📒 ᴏᴜᴛᴘᴜᴛ:\n{evason}\n✨ ᴛɪᴍᴇ ᴛᴀᴋᴇɴ: {runcs}ᴍɪʟɪsᴇᴄᴏɴᴅ"
    if len(oucode) > 69696969:
        await message.edit("⚠️ ᴏᴜᴛᴘᴜᴛ ᴛᴏᴏ ʟᴏɴɢ...")
    else:
        await message.edit(oucode)

app.run()
app.send_message(-1002361092154, "__**Chutiya Started**__")
