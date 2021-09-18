import {settings} from '../settings.js';
import {utils} from '../utils/utils.js';


const bttvGlobalJson = "https://api.betterttv.net/3/cached/emotes/global";
const bttvChannelJson = "https://api.betterttv.net/3/cached/users/twitch/";
const sevenTvChannelJson = "https://api.7tv.app/v2/users/";


class Emotes{
    constructor(){
        this.urls = {
            twitch: "https://static-cdn.jtvnw.net/emoticons/v1/",
            bttv: "https://cdn.betterttv.net/emote/",
            ffz: "https://api.frankerfacez.com/v1/room/",
        };
        this.emotes = {
            "ffz": new Map(),
            "bttv": new Map(),
            "7tv": new Map(),
        };
        this.scale = 1;
    }

    getScaleStr(type){
        if(type === "bttv"){
            return this.scale + "x";
        }
        else if(type === "twitch"){
            return this.scale + ".0";
        }
    }

    getFFZscaleUrl(urls){
        let scales = [4,3,2,1].sort((a,b)=>{
            return Math.abs(a-this.scale) < Math.abs(b-this.scale) ? -1 : 1;
        });
        let i, url;
        for(i of scales){
            url = urls[i];
            if(url){
                url = "https://" + url.substring(2);
                return url;
            }
        }
    }

    getSrcUrl(id, type="twitch"){
        let scale = this.getScaleStr(type);
        return this.urls[type] + id + "/" + scale;
    }

    getEmoteUrl(name){
        let type, emote, url;
        for(type in this.emotes){
            emote = this.emotes[type].get(name);
            if(emote === undefined){continue;}
            if(type === "ffz"){
                url = this.getFFZscaleUrl(emote);
            }
            else if (type === "7tv") {
                url = emote['urls'][this.scale];
            }
            else{
                url = this.getSrcUrl(emote, type);
            }
            return url;
        }
    }

    getEmoteStr(url, emoteName){
        let src = url;
        let size = this.pxSize + "px";
        return `<img class="chat-emote" title="${emoteName}" src="${src}" />`;
    }

    getEmoteFromFragment(fragment){
        let text, emoticon, url;
        text = fragment.text;
        emoticon = fragment.emoticon;
        if(emoticon){
            url = this.getSrcUrl(emoticon.emoticon_id);
            return this.getEmoteStr(url, fragment.text);
        }
        else{
            return this.getNonNativeEmote(utils.escape(text));
        }
    }

    getNonNativeEmote(word){
        let url = this.getEmoteUrl(word);
        if(url){
            return this.getEmoteStr(url, word);
        }
    }

    convertBttvEmotes(emotes){
        if(!emotes){return;}
        let emote;
        for(emote of emotes){
            this.emotes["bttv"].set(emote["code"], emote["id"]);
        }
    }

    convertChannelBttvEmotes(json){
        if(!json)return;
        const sharedEmotes = json.sharedEmotes;
        const channelEmotes = json.channelEmotes;
        this.convertBttvEmotes(sharedEmotes);
        this.convertBttvEmotes(channelEmotes);
    }

    convertChannel7TvEmotes(json){
        if(!json)return;
        for (let emote of json) {
            this.emotes['7tv'].set(emote['name'], {
                id: emote.id,
                name: emote.name,
                urls: {
                    1: emote.urls[0][1],
                    2: emote.urls[1][1],
                    3: emote.urls[2][1],
                    4: emote.urls[3][1]
                },
            });
        }
    }

    loadEmoteData(channel, channelId){
        let url = this.urls.ffz;
        if(channelId){
            url = url+"id/"+channelId;
        } 
        else{
            url = this.urls.ffz + channel;
        }
        let ffzChannelPromise = utils.fetch(url).then(json=>{
            if(!json){return;}
            let sets = json.sets;
            let set, emotes, emote;
            for(set in sets){
                emotes = sets[set]["emoticons"];
                for(emote of emotes){
                    this.emotes["ffz"].set(emote["name"], emote.urls);
                }
            }                
        });

        let bttvGlobalPromise = utils.fetch(bttvGlobalJson).then(json=>{
            this.convertBttvEmotes(json);
        });
        let bttvChannelPromise = utils.fetch(bttvChannelJson + channelId).then(json=>{
            this.convertChannelBttvEmotes(json);
        });
        let seventvChannelPromise = utils.fetch(sevenTvChannelJson + channelId + "/emotes").then(json=>{
            this.convertChannel7TvEmotes(json);
        });

        return Promise.all([seventvChannelPromise, ffzChannelPromise, bttvChannelPromise, bttvGlobalPromise]);
    }
}

export {Emotes};
