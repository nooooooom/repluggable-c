import { SlotRenderer } from '@repluggable-c/vue'
import type { ExtensionSlot } from 'repluggable'
import { defineComponent } from 'vue-demi'
import type { PropType } from 'vue-demi'
import type { ContributedComponent } from '../mainViewAPI'

const slotItemToComp = ({ component }: ContributedComponent) => component

export const MainView = defineComponent({
  props: {
    extensionSlot: {
      type: Object as PropType<ExtensionSlot<ContributedComponent>>,
      required: true
    }
  },
  render() {
    return (
      <div class="MainView">
        <SlotRenderer
          extensionSlot={this.extensionSlot}
          mapFunc={slotItemToComp}
        />
      </div>
    )
  }
})
