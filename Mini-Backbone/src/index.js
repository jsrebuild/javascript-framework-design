import { Events } from './Events/index'
import { Model } from './Model/index'
import { Collection } from './Collection/index'
import { View } from './View/index'
import { Router } from './Router/index'
import { extend } from './Helpers/index'


// define global
var mBackbone = {}

Model.extend = Collection.extend = Router.extend = View.extend = extend

mBackbone.Events = Events
mBackbone.Model = Model
mBackbone.Collection = Collection
mBackbone.Router = Router
mBackbone.View = View


export default mBackbone
