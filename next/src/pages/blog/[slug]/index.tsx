import styled from "styled-components";

import { Main } from "@Components/main";
import { getSortedPostsData } from "@Root/lib/blog";
import { Text, Title } from "@Common/index";

interface PostData {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  slug: string;
  content: string;
}

interface PostProps {
  post: PostData;
}

const BlogText = styled(Text)`
  padding: 0.5rem 0;
`;

export default function Post({ post }: PostProps) {
  const contentParagraphs = post.content.split("\n");
  const paragraphsToJSX = contentParagraphs.map((para, i) => {
    if (para) {
      return <BlogText key={i}>{para}</BlogText>;
    }
  });

  return (
    <Main userKey={null}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Text light focus>
          {post.title}
        </Text>
        {paragraphsToJSX}
      </div>
    </Main>
  );
}

export async function getStaticPaths() {
  const allPostsData: Array<PostData> = getSortedPostsData() as Array<PostData>;
  const paths = allPostsData.map((p) => ({ params: { slug: p.slug } }));
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps(ctxt: any) {
  const { slug } = ctxt.params;
  const allPostsData: Array<PostData> = getSortedPostsData() as Array<PostData>;
  const post = allPostsData.filter((p) => p.slug === slug)[0];
  return {
    props: {
      post,
    },
  };
}
