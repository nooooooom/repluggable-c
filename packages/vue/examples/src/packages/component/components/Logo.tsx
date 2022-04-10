import { defineComponent } from 'vue-demi'
import logoUrl from '../assets/logo.png'

export const Logo = defineComponent({
  render() {
    return <img alt="Vue logo" src={logoUrl} />
  }
})
