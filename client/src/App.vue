<template>
    <div
        class="wrapped"
        :style="{
            alignItems: dataList.length > 0 ? 'flex-start' : 'center',
        }">
        <div>
            <div class="search-area">
                <a-radio-group v-model:value="searchType">
                    <a-radio :value="1">布尔检索</a-radio>
                    <a-radio :value="0">向量检索</a-radio>
                    <a-radio :value="2">概率检索</a-radio>
                </a-radio-group>
                <div>
                    <a-input-search
                        v-if="searchType === 1"
                        v-model:value="keyword"
                        placeholder="输入检索式(且:&,或|,非!,优先级())"
                        enter-button
                        size="mini"
                        style="width: 800px"
                        allow-clear
                        @search="searchByBoolean" />
                    <a-input-search
                        v-if="searchType === 0"
                        v-model:value="keyword"
                        placeholder="输入检索关键词"
                        enter-button
                        size="mini"
                        style="width: 800px"
                        allow-clear
                        @search="searchByVector" />
                    <a-input-search
                        v-if="searchType === 2"
                        v-model:value="keyword"
                        placeholder="输入检索关键词"
                        enter-button
                        size="mini"
                        style="width: 800px"
                        allow-clear
                        @search="searchByProbability" />
                </div>
            </div>
            <div class="input-article">
                <a-button type="link" @click="visible = true"> 添加检索内容</a-button>
                <a-modal
                    v-model:visible="visible"
                    title="添加检索内容"
                    @ok="addContent"
                    cancelText="不确定，再看看"
                    okText="不管了，提交">
                    <a-form ref="form" :model="formState">
                        <a-form-item
                            label="标题"
                            name="title"
                            :rules="[{ required: true, message: 'Please input your title!' }]">
                            <a-input size="small" v-model:value="formState.title" />
                        </a-form-item>
                        <a-form-item label="关键字" name="keyword">
                            <template v-for="(tag, index) in formState.keyword" :key="tag">
                                <a-tag color="#55acee" closable @close="handleClose(tag)">
                                    {{ tag }}
                                </a-tag>
                            </template>
                            <a-input
                                v-if="inputVisible"
                                ref="inputRef"
                                v-model:value="inputValue"
                                type="text"
                                size="small"
                                :style="{ width: '78px' }"
                                @blur="handleInputConfirm"
                                @keyup.enter="handleInputConfirm" />
                            <a-tag v-else style="background: #fff; border-style: dashed" @click="showInput">
                                增加
                            </a-tag>
                        </a-form-item>
                        <a-form-item
                            label="内容"
                            name="content"
                            :rules="[{ required: true, message: 'Please input your content!' }]">
                            <a-textarea :auto-size="{ minRows: 16 }" size="small" v-model:value="formState.content" />
                        </a-form-item>
                    </a-form>
                </a-modal>
            </div>
        </div>
        <div class="results" v-if="dataList.length > 0">
            <a-list item-layout="vertical" size="large" :data-source="dataList">
                <template #renderItem="{ item }">
                    <a-list-item key="item.title">
                        <a-list-item-meta>
                            <template #title>
                                <a :href="item.href">{{ item.title }}</a>
                            </template>
                            <template #avatar>
                                <a-avatar style="color: #f56a00; background-color: #fde3cf">
                                    {{ item.title[0] }}
                                </a-avatar>
                            </template>
                        </a-list-item-meta>
                        {{ item.content }}
                    </a-list-item>
                </template>
            </a-list>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";

const instance = getCurrentInstance();
const keyword = ref("");
const visible = ref(false);
const dataList = ref([]);
const formState = reactive({
    title: "",
    keyword: [],
    content: "",
});
const searchType = ref(0);

const searchByVector = async () => {
    const {
        data: { data, code, msg },
    } = await axios.post("/api/searchByVector", {
        keyword: keyword.value,
    });
    message[code](msg);
    dataList.value = data;
};

const searchByBoolean = async () => {
    const {
        data: { data, code, msg },
    } = await axios.post("/api/searchByBoolean", {
        keyword: keyword.value,
    });
    message[code](msg);
    dataList.value = data;
};

const searchByProbability = async () => {
    const {
        data: { data, code, msg },
    } = await axios.post("/api/searchByProbability", {
        keyword: keyword.value,
    });
    message[code](msg);
    dataList.value = data;
};

const addContent = async () => {
    try {
        await instance.refs.form.validate();
        const res = await axios.post("/api/insert", {
            ...formState,
        });
    } catch (error) {
        console.log(error);
    }
};

const handleClose = removedTag => {
    const tags = formState.keyword.filter(tag => tag !== removedTag);
    formState.keyword = tags;
};

const inputValue = ref("");
const inputVisible = ref(false);

const showInput = () => {
    inputVisible.value = true;
};
const handleInputConfirm = () => {
    inputVisible.value = false;
    // let tags = formState.keyword;
    if (inputValue.value && formState.keyword.indexOf(inputValue.value) === -1) {
        formState.keyword.push(inputValue.value);
    }
    inputValue.value = "";
    // formState.keyword = tags;
};
</script>

<style>
.wrapped {
    display: flex;
    justify-content: center;
    flex-direction: column;
    height: 100%;
    padding: 20px;
}
.wrapped .results {
    flex: 1;
    width: 100%;
    /* align-items: flex-start; */
}
</style>
