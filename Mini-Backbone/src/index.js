import { Events } from './Events/index'
import { Model } from './Model/index'
import { Collection } from './Collection/index'
import { View } from './View/index'
import { Router } from './Router/index'
import { extend } from './Helpers/index'



Model.extend = Collection.extend = Router.extend = View.extend = extend

export default mBackbone